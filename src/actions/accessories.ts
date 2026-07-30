'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { AccessoryCreateSchema, AccessoryUpdateSchema } from '@/lib/validation';
import type { ActionResult } from '@/actions/stock';

export async function getAccessoriesAction(params: {
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const search = params.search?.trim() || '';
    const sort = params.sort?.trim() || 'newest';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(500, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { modelName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderByMap: Record<string, any> = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      price_desc: { purchasePrice: 'desc' },
      price_asc: { purchasePrice: 'asc' },
      qty_desc: { quantity: 'desc' },
      qty_asc: { quantity: 'asc' },
    };
    const orderBy = orderByMap[sort] || { createdAt: 'desc' };

    const [rawItems, totalCount] = await Promise.all([
      prisma.accessory.findMany({ where, orderBy, skip, take: limit }),
      prisma.accessory.count({ where }),
    ]);

    const allAccessories = await prisma.accessory.findMany({
      where: { deletedAt: null },
      select: { purchasePrice: true, quantity: true },
    });

    let totalUnits = 0;
    let costValue = 0;
    allAccessories.forEach((item) => {
      totalUnits += item.quantity;
      costValue += Number(item.purchasePrice) * item.quantity;
    });

    const formattedItems = rawItems.map((item) => ({
      ...item,
      purchasePrice: Number(item.purchasePrice),
      dateAdded: item.dateAdded.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedItems,
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
      summary: { totalUnits, costValue },
    };
  } catch (error: any) {
    console.error('getAccessoriesAction error:', error);
    return { success: false, error: 'Failed to fetch accessories', data: [] };
  }
}

export async function addAccessoryAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = AccessoryCreateSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Please fix the form errors.',
    };
  }

  const data = parsed.data;
  try {
    const existing = await prisma.accessory.findFirst({
      where: { name: data.name, modelName: data.modelName, deletedAt: null },
    });

    if (existing) {
      await prisma.accessory.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + data.quantity },
      });
    } else {
      await prisma.accessory.create({
        data: {
          name: data.name,
          modelName: data.modelName,
          purchasePrice: data.purchasePrice,
          quantity: data.quantity,
          dateAdded: data.dateAdded ? new Date(data.dateAdded) : new Date(),
        },
      });
    }

    revalidatePath('/dashboard/accessories');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('addAccessoryAction error:', err);
    return { success: false, error: 'Failed to add accessory.' };
  }
}

export async function editAccessoryAction(
  id: number,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = AccessoryUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Please fix the form errors.',
    };
  }

  const data = parsed.data;
  try {
    const existing = await prisma.accessory.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Accessory not found.' };

    await prisma.accessory.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.modelName !== undefined && { modelName: data.modelName }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
      },
    });

    revalidatePath('/dashboard/accessories');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('editAccessoryAction error:', err);
    return { success: false, error: 'Failed to update accessory.' };
  }
}

export async function deleteAccessoryAction(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.accessory.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: 'Accessory not found.' };

    await prisma.accessory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/dashboard/accessories');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('deleteAccessoryAction error:', err);
    return { success: false, error: 'Failed to delete accessory.' };
  }
}
