from pathlib import Path
p = Path('/opt/sochi-portal-staging/src/app/dashboard/messages/page.tsx')
t = p.read_text()
old = "import { splitMessageBodyMedia } from '@/lib/message-body-media';"
new = "import { splitMessageBodyMedia } from '@/lib/message-body-media';\nimport { fetchUserApiCached } from '@/lib/user-data-client';"
if old not in t:
    raise SystemExit('import anchor missing')
if "fetchUserApiCached" not in t:
    t = t.replace(old, new, 1)
old_pull = """      const response = await fetch(`/api/messages?${qs}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Не удалось загрузить');
      return result;"""
new_pull = """      const result = (await fetchUserApiCached(`/api/messages?${qs}`, 12_000)) as {
        conversations?: unknown[];
        message?: string;
      };
      return result;"""
if old_pull not in t:
    raise SystemExit('pull fetch missing')
t = t.replace(old_pull, new_pull, 1)
p.write_text(t)
print('messages patched')
