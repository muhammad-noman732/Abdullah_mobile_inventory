'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { StockCreateSchema, StockUpdateSchema, StockAdjustSchema } from '@/lib/validation';

export type ActionResult<T = null> = {
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
};

// ── READ: Fetch stock list with filters, sorting, and summary metrics ──────────
export async function getStockAction(params: {
  search?: string;
  brand?: string;
  condition?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const search = params.search?.trim() || '';
    const brand = params.brand?.trim() || '';
    const condition = params.condition?.trim() || '';
    const status = params.status?.trim() || '';
    const sort = params.sort?.trim() || 'newest';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(500, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.StockWhereInput = { deletedAt: null };
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { variant: { contains: search, mode: 'insensitive' } },
        { imei: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (brand && brand !== 'all') where.brand = { equals: brand, mode: 'insensitive' };
    if (condition && condition !== 'all') where.condition = { equals: condition, mode: 'insensitive' };

    const orderByMap: Record<string, Prisma.StockOrderByWithRelationInput> = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      price_desc: { sellingPrice: 'desc' },
      price_asc: { sellingPrice: 'asc' },
      qty_desc: { quantity: 'desc' },
      qty_asc: { quantity: 'asc' },
    };
    const orderBy = orderByMap[sort] || { createdAt: 'desc' };

    const [rawItems, totalCount] = await Promise.all([
      prisma.stock.findMany({ where, orderBy, skip, take: limit }),
      prisma.stock.count({ where }),
    ]);

    const distinctBrandsRaw = await prisma.stock.findMany({
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });

    const allStock = await prisma.stock.findMany({
      select: { purchasePrice: true, sellingPrice: true, quantity: true, lowStockAlert: true },
    });

    let totalModels = allStock.length;
    let totalUnits = 0, costValue = 0, sellingValue = 0;
    allStock.forEach((item) => {
      totalUnits += item.quantity;
      costValue += Number(item.purchasePrice) * item.quantity;
      sellingValue += Number(item.sellingPrice) * item.quantity;
    });

    // Format Decimal values for client serialization
    const formattedItems = rawItems.map((item) => ({
      ...item,
      purchasePrice: Number(item.purchasePrice),
      sellingPrice: Number(item.sellingPrice),
      dateAdded: item.dateAdded.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }));

    let filteredItems = formattedItems;
    if (status === 'instock') filteredItems = formattedItems.filter((i) => i.quantity > i.lowStockAlert);
    else if (status === 'low') filteredItems = formattedItems.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockAlert);
    else if (status === 'out') filteredItems = formattedItems.filter((i) => i.quantity === 0);

    return {
      success: true,
      data: filteredItems,
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
      summary: { totalModels, totalUnits, costValue, sellingValue, potentialProfit: sellingValue - costValue },
      brands: distinctBrandsRaw.map((b) => b.brand),
    };
  } catch (error: any) {
    console.error('getStockAction error:', error);
    return { success: false, error: 'Failed to fetch stock items', data: [], brands: [] };
  }
}

// ── MUTATION: Add new stock item ───────────────────────────────────────────────
export async function addStockAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = StockCreateSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Please fix the form errors.',
    };
  }

  const data = parsed.data;
  try {
    await prisma.stock.create({
      data: {
        brand: data.brand,
        model: data.model,
        variant: data.variant || null,
        condition: data.condition,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        lowStockAlert: data.lowStockAlert,
        imei: data.imei || null,
        notes: data.notes || null,
        dateAdded: data.dateAdded ? new Date(data.dateAdded) : new Date(),
      },
    });

    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('addStockAction error:', err);
    return { success: false, error: 'Failed to add stock item.' };
  }
}

// ── MUTATION: Edit existing stock item ─────────────────────────────────────────
export async function editStockAction(
  id: number,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = StockUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Please fix the form errors.',
    };
  }

  const data = parsed.data;
  try {
    const existing = await prisma.stock.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Stock item not found.' };

    await prisma.stock.update({
      where: { id },
      data: {
        ...(data.brand && { brand: data.brand }),
        ...(data.model && { model: data.model }),
        ...(data.variant !== undefined && { variant: data.variant || null }),
        ...(data.condition && { condition: data.condition }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.lowStockAlert !== undefined && { lowStockAlert: data.lowStockAlert }),
        ...(data.imei !== undefined && { imei: data.imei || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('editStockAction error:', err);
    return { success: false, error: 'Failed to update stock item.' };
  }
}

// ── MUTATION: Adjust stock quantity ───────────────────────────────────────────
export async function adjustStockAction(
  id: number,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = StockAdjustSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid adjustment data.',
    };
  }

  const { adjustment, reason } = parsed.data;
  try {
    const existing = await prisma.stock.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Stock item not found.' };

    const newQty = existing.quantity + adjustment;
    if (newQty < 0) {
      return {
        success: false,
        error: `Cannot reduce below 0. Current quantity: ${existing.quantity}`,
      };
    }

    const dateStr = new Date().toLocaleDateString('en-PK');
    const logEntry = `[${dateStr} Adj: ${adjustment > 0 ? '+' : ''}${adjustment} — ${reason}]`;
    const updatedNotes = existing.notes ? `${existing.notes}\n${logEntry}` : logEntry;

    await prisma.stock.update({
      where: { id },
      data: { quantity: newQty, notes: updatedNotes },
    });

    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('adjustStockAction error:', err);
    return { success: false, error: 'Failed to adjust quantity.' };
  }
}

// ── MUTATION: Soft-delete stock item ─────────────────────────────────────────
export async function deleteStockAction(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.stock.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: 'Stock item not found.' };

    await prisma.stock.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('deleteStockAction error:', err);
    return { success: false, error: 'Failed to delete stock item.' };
  }
}
