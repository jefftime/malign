import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.malign', () => {
    const ed = vscode.window.activeTextEditor;
    if (ed === undefined) return;

    let originalTexts: string[] = [];
    ed.selections.forEach(sel => {
      originalTexts.push(ed.document.getText(sel));
    });
    let input = vscode.window.createInputBox();
    let accept = false;
    input.onDidAccept(() => {
      accept = true;
      input.hide();
    });
    input.onDidHide(() => {
      if (accept) return;
      ed.edit(eb => {
        for (let i = 0; i < originalTexts.length; ++i) {
          eb.replace(ed.selections[i], originalTexts[i]);
        }
      });
    });
    input.onDidChangeValue(async str => {
      if (str === '') return;

      await ed.edit(eb => {
        ed.selections.forEach(sel => {
          let lines = ed.document.getText(sel).split('\n');
          if (lines.length === 0) return;
          let newLines: string[] = [];
          lines
            .filter(line => line.length > 0)
            .forEach(line => {
              newLines.push(
                line.replace(new RegExp(`\(${input.value}\)`), ':)')
              );
              newLines.push(line.replace(str, '\$\$'));
            });
          eb.replace(sel, newLines.join('\n'));
        });
      });
    });
    input.show();
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
