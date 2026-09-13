import { prisma } from '@/lib/prisma';
import { FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq-content';
import { isNextBuildPhase } from '@/lib/build-phase';

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `cat-${Date.now().toString(36)}`;
}

export async function getPublishedFaqCategories(): Promise<FaqCategory[]> {
  if (isNextBuildPhase()) return [];
  await ensureBuiltinFaq();
  const rows = await prisma.faqCategory.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      items: {
        where: { published: true },
        orderBy: [{ sortOrder: 'asc' }, { question: 'asc' }],
        select: { id: true, question: true, answer: true, categoryId: true },
      },
    },
  });
  return rows
    .filter((c) => c.items.length > 0)
    .map((c) => ({
      id: c.slug || c.id,
      title: c.title,
      items: c.items.map((i) => ({ id: i.id, categoryId: i.categoryId, q: i.question, a: i.answer })),
    }));
}

export async function listFaqAdmin() {
  return prisma.faqCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      items: { orderBy: [{ sortOrder: 'asc' }, { question: 'asc' }] },
      _count: { select: { items: true } },
    },
  });
}

export { slugify };

/** Copy built-in /faq topics into the database so admin and the public page share one list. */
export async function ensureBuiltinFaq() {
  if (isNextBuildPhase()) return { createdCategories: 0, createdItems: 0 };
  let createdCategories = 0;
  let createdItems = 0;
  for (let i = 0; i < FAQ_CATEGORIES.length; i++) {
    const cat = FAQ_CATEGORIES[i];
    const slug = slugify(cat.id);
    let row = await prisma.faqCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!row) {
      row = await prisma.faqCategory.create({
        data: { title: cat.title, slug, sortOrder: i, published: true },
        select: { id: true },
      });
      createdCategories += 1;
    } else {
      await prisma.faqCategory.update({
        where: { id: row.id },
        data: { title: cat.title, sortOrder: i, published: true },
      });
    }
    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      const exists = await prisma.faqItem.findFirst({
        where: { categoryId: row.id, question: item.q },
        select: { id: true },
      });
      if (exists) {
        await prisma.faqItem.update({
          where: { id: exists.id },
          data: { answer: item.a, sortOrder: j, published: true },
        });
        continue;
      }
      await prisma.faqItem.create({
        data: {
          categoryId: row.id,
          question: item.q,
          answer: item.a,
          sortOrder: j,
          published: true,
        },
      });
      createdItems += 1;
    }
  }
  return { createdCategories, createdItems };
}
