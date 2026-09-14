import { parseStudioJson } from '@/lib/youth-studio';
import { EntityApplyStatus } from '@/components/entity/EntityAuthIslands';

export default function YouthJoinBlock({
  kind,
  id,
  open,
  studioJson,
  signupUrl,
  curatorName,
  curatorContact,
  curatorPublic,
  coworkingHref,
  hallHref,
  hideApply,
}: {
  kind: 'project' | 'club' | 'space';
  id: string;
  open: boolean;
  studioJson?: string | null;
  signupUrl?: string | null;
  curatorName?: string | null;
  curatorContact?: string | null;
  curatorPublic?: boolean;
  coworkingHref?: string | null;
  hallHref?: string | null;
  hideApply?: boolean;
}) {
  const s = parseStudioJson(studioJson);
  const url = s.signupUrl || signupUrl || '';
  const name = s.curatorName || curatorName || '';
  const contact = curatorPublic === false ? '' : s.curatorContact || curatorContact || '';
  const mode = s.joinMode;
  if (!open && mode !== 'none') return null;
  return (
    <aside className="youth-join-block">
      <h2>Как вступить</h2>
      {s.howToJoin ? <p>{s.howToJoin}</p> : null}
      {s.audience ? (
        <p>
          <strong>Кому:</strong> {s.audience}
        </p>
      ) : null}
      {s.whatHappens ? (
        <p>
          <strong>Что будет:</strong> {s.whatHappens}
        </p>
      ) : null}
      {name ? (
        <p>
          <strong>Ведёт:</strong> {name}
          {contact ? ` · ${contact}` : ''}
        </p>
      ) : null}
      {hideApply ? null : mode === 'link' && url ? (
        <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer">
          Записаться
        </a>
      ) : null}
      {hideApply ? null : (mode === 'apply' || !mode) ? (
        kind === 'space' ? (
          <div className="youth-join-block__actions">
            {coworkingHref ? (
              <a className="btn btn-primary" href={coworkingHref}>
                Записаться в коворкинг
              </a>
            ) : null}
            {hallHref ? (
              <a className="btn btn-secondary" href={hallHref}>
                Бронь зала
              </a>
            ) : null}
          </div>
        ) : (
          <EntityApplyStatus kind={kind} id={id} open={open} />
        )
      ) : null}
      {mode === 'open' ? <p className="youth-join-block__open">Можно приходить без записи.</p> : null}
      {mode === 'none' ? <p>Сейчас набор не идёт — можно следить за обновлениями.</p> : null}
    </aside>
  );
}
