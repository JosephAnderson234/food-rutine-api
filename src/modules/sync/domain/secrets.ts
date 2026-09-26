/**
 * Campos secretos dentro de los documentos sincronizados (p. ej. el token de Todoist).
 * Se guardan cifrados en la base: una copia filtrada de la DB no los expone.
 * El cifrado concreto lo aporta el puerto SecretCipher.
 */

/** Rutas de campos secretos por colección. */
export const SECRET_FIELDS: Record<string, string[][]> = {
  settings: [['todoist', 'token']],
};

/** Prefijo de un valor ya cifrado (evita cifrar dos veces). */
export const SEALED_PREFIX = 'enc:v1:';

type Doc = Record<string, unknown>;

function isDoc(v: unknown): v is Doc {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Copia el documento aplicando `fn` al valor en `path` (si existe y es string). */
function mapAt(
  doc: Doc,
  path: string[],
  fn: (value: string) => string | undefined,
): Doc {
  const [head, ...rest] = path;
  if (!(head in doc)) return doc;
  const child = doc[head];
  if (rest.length === 0) {
    if (typeof child !== 'string') return doc;
    const next = fn(child);
    const copy = { ...doc };
    if (next === undefined) delete copy[head];
    else copy[head] = next;
    return copy;
  }
  if (!isDoc(child)) return doc;
  return { ...doc, [head]: mapAt(child, rest, fn) };
}

function transform(
  collection: string,
  data: unknown,
  fn: (value: string) => string | undefined,
): unknown {
  const paths = SECRET_FIELDS[collection];
  if (!paths || !isDoc(data)) return data;
  return paths.reduce<Doc>((doc, path) => mapAt(doc, path, fn), data);
}

/** Antes de guardar: cifra los campos secretos que lleguen en claro. */
export function sealSecrets(
  collection: string,
  data: unknown,
  seal: (plain: string) => string,
): unknown {
  return transform(collection, data, (v) =>
    v.startsWith(SEALED_PREFIX) ? v : `${SEALED_PREFIX}${seal(v)}`,
  );
}

/**
 * Antes de entregar al dispositivo: descifra. Si no se puede (llave rotada o dato
 * corrupto) se omite el campo en vez de romper la sincronización.
 */
export function openSecrets(
  collection: string,
  data: unknown,
  open: (sealed: string) => string,
): unknown {
  return transform(collection, data, (v) => {
    if (!v.startsWith(SEALED_PREFIX)) return v;
    try {
      return open(v.slice(SEALED_PREFIX.length));
    } catch {
      return undefined;
    }
  });
}
