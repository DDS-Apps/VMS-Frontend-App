import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('valet Android notification contract', () => {
  it('registers a high-importance tasks channel and a manifest fallback', () => {
    const service = readFileSync(
      join(process.cwd(), 'services/push/pushNotificationService.ts'),
      'utf8'
    );
    const manifestPlugin = readFileSync(
      join(process.cwd(), 'plugins/withNotificationManifestFix.js'),
      'utf8'
    );

    expect(service).toMatch(/setNotificationChannelAsync\('tasks'/);
    expect(service).toMatch(/name: 'Task Assignments',[\s\S]*?AndroidImportance\.HIGH/);
    expect(manifestPlugin).toContain("'android:value': 'default'");
  });

  it('documents display fields, type, recipient, channel, and identifier', () => {
    const contract = readFileSync(
      join(process.cwd(), 'docs/FIREBASE_BACKEND_ALIGNMENT.md'),
      'utf8'
    );
    expect(contract).toContain('active `valet_admin` device tokens');
    expect(contract).toContain('type: "valet_new_request"');
    expect(contract).toContain('taskId: "<valet task/request identifier>"');
    expect(contract).toContain('channelId: "tasks"');
    expect(contract).toContain('notification.title');
    expect(contract).toContain('notification.body');
  });
});