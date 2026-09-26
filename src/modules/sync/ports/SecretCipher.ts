/** Cifrado simétrico de valores secretos guardados en documentos sincronizados. */
export interface SecretCipher {
  seal(plain: string): string;
  /** Lanza si el valor no se puede descifrar (llave distinta o dato alterado). */
  open(sealed: string): string;
}
