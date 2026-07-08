const fs = require('fs');
const locales = ['en', 'zh-Hans', 'ja', 'ko'];
for (const locale of locales) {
  const path = `./packages/views/locales/${locale}/settings.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  if (!data.account.section_connected_accounts) {
    data.account.section_connected_accounts = "Connected Accounts";
    data.account.github_not_connected = "Not connected";
    data.account.connect = "Connect";
    data.account.disconnect = "Disconnect";
  }
  
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
