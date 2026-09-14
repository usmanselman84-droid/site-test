import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { recoveryPhraseRateLimiter } from '@/lib/rateLimit';
import {
  RECOVERY_PHRASE_WORDS,
  splitRecoveryWords,
  validateRecoveryWords,
  verifyRecoveryPhrase,
} from '@/lib/recovery-phrase';
import { requestClientIp } from '@/lib/request-ip';
import { isPhoneLikeLogin, phoneNational10 } from '@/lib/phone';

const schema = z.object({
  login: z.string().min(3, 'Укажите email или телефон').optional(),
  email: z.string().optional(),
  phrase: z.string().min(10, 'Введите фразу из 24 слов'),
  password: z
    .string()
    .min(10, 'Пароль должен быть минимум 10 символов')
    .max(100)
    .refine((p) => /[A-Za-zА-Яа-яЁё]/.test(p) && /\d/.test(p), {
      message: 'Пароль должен содержать буквы и цифры',
    }),
});

async function findUserForRecovery(loginRaw: string) {
  const raw = loginRaw.trim();
  if (!raw) return null;
  const select = {
    id: true,
    recoveryPhraseHash: true,
    blockedAt: true,
    deletedAt: true,
  } as const;
  if (raw.includes('@') || !isPhoneLikeLogin(raw)) {
    return prisma.user.findFirst({
      where: { email: { equals: raw.toLowerCase(), mode: 'insensitive' } },
      select,
    });
  }
  const national = phoneNational10(raw);
  if (national.length !== 10) {
    return prisma.user.findFirst({
      where: { phone: raw },
      select,
    });
  }
  const rows = await prisma.$queryRaw<Array<{ id: string; recoveryPhraseHash: string | null; blockedAt: Date | null; deletedAt: Date | null }>>`
    SELECT id, "recoveryPhraseHash", "blockedAt", "deletedAt"
    FROM "User"
    WHERE length(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) >= 10
      AND right(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = ${national}
    LIMIT 1
  `;
  return rows[0] || null;
}

/**
 * Reset password using the offline 24-word Russian recovery phrase.
 */
export async function POST(req: Request) {
  try {
    const ip = requestClientIp(req);
    if (!await recoveryPhraseRateLimiter.checkAsync(`phrase:${ip}`)) {
      return NextResponse.json(
        { message: 'Слишком много попыток. Подождите 15 минут.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const { phrase, password } = parsed.data;
    const login = String(parsed.data.login || parsed.data.email || '').trim();
    if (!login) {
      return NextResponse.json({ message: 'Укажите email или телефон' }, { status: 400 });
    }
    const words = splitRecoveryWords(phrase);
    const wordCheck = validateRecoveryWords(words);
    if (!wordCheck.ok) {
      return NextResponse.json({ message: wordCheck.message }, { status: 400 });
    }

    const user = await findUserForRecovery(login);

    // Same generic error whether user/phrase missing — avoid account enumeration
    const fail = () =>
      NextResponse.json(
        { message: 'Неверный логин или фраза восстановления' },
        { status: 400 }
      );

    if (!user || user.deletedAt || user.blockedAt || !user.recoveryPhraseHash) {
      return fail();
    }

    if (!await recoveryPhraseRateLimiter.checkAsync(`phrase:user:${user.id}`)) {
      return NextResponse.json(
        { message: 'Слишком много попыток для этого аккаунта. Подождите.' },
        { status: 429 }
      );
    }

    const ok = await verifyRecoveryPhrase(words, user.recoveryPhraseHash);
    if (!ok) return fail();

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        // Keep the same phrase valid; user can rotate it after login
        tokenVersion: { increment: 1 },
        tokenKeepAlive: null,
      },
    });

    return NextResponse.json({
      message: 'Пароль изменён. Войдите с новым паролем.',
      wordCount: RECOVERY_PHRASE_WORDS,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
