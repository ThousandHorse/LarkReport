/**
 * env.js
 *
 * 環境変数をロードする。
 * ESM では import 文がホイスティングされるため dotenv.config() を
 * 依存モジュールより先に実行することができない。
 * このモジュールを最初に import することで確実に .env をロードする。
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
