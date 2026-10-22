// Worker que resuelve la prueba de trabajo del portal de seguimiento (A2) fuera del hilo de la interfaz,
// para que la página no se quede bloqueada mientras busca el nonce. La cuenta está en src/lib/pow.js.
import { solveProofOfWork } from '../../lib/pow.js';

self.onmessage = async (e) => {
  const { token, bits } = e.data || {};
  try {
    self.postMessage({ nonce: await solveProofOfWork(token, bits) });
  } catch (err) {
    self.postMessage({ error: String((err && err.message) || err) });
  }
};
