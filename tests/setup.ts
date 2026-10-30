import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each test file gets its own data folder. The databases are in memory and
// start their ids at 1, so a shared folder let files overwrite each other's art.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ksa-test-"));
