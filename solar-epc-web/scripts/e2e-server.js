const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const prismaConfigPath = path.join(process.cwd(), "prisma.config.ts");
const prismaBackupPath = path.join(process.cwd(), "prisma.config.ts.bak");

const hidePrismaConfig = () => {
  if (fs.existsSync(prismaConfigPath)) {
    fs.renameSync(prismaConfigPath, prismaBackupPath);
  }
};

const restorePrismaConfig = () => {
  if (fs.existsSync(prismaBackupPath)) {
    fs.renameSync(prismaBackupPath, prismaConfigPath);
  }
};

const run = (command, args) =>
  spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

hidePrismaConfig();

const migrate = run("npx", ["prisma", "db", "push"]);
if (migrate.status !== 0) {
  restorePrismaConfig();
  process.exit(migrate.status || 1);
}

const devServer = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

const shutdown = () => {
  if (!devServer.killed) {
    devServer.kill();
  }
  restorePrismaConfig();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", restorePrismaConfig);
