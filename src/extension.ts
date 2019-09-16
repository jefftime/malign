/* This file is part of Malign
 *
 * Copyright 2019, Jeffery Stager
 *
 * Malign is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Malign is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.malign', () => {
    const ed = vscode.window.activeTextEditor;
    if (ed === undefined) return;

    // Text per selection
    let originalTexts: string[] = [];
    ed.selections.forEach(sel => originalTexts.push(ed.document.getText(sel)));

    const resetOriginalText = async () => {
      await ed.edit(eb => {
        for (let i = 0; i < originalTexts.length; ++i) {
          eb.replace(ed.selections[i], originalTexts[i]);
        }
      });
    }

    // Input for regex
    let input = vscode.window.createInputBox();
    let accept = false;
    input.onDidAccept(() => {
      accept = true;
      input.hide();
    });
    input.onDidHide(() => {
      if (accept) return;

      // Set back to original text if user didn't accept
      resetOriginalText();
    });
    input.onDidChangeValue(async str => {
      await resetOriginalText();
      if (str === '') return;

      await ed.edit(eb => {
        ed.selections.forEach(sel => {

          // Start processing current selection text
          let lines = ed.document.getText(sel).split('\n');
          if (lines.length === 0) return;

          interface LineSplit {
            index: number;
            matches: boolean;
            splits: string[]
          };

          // Split lines on user input
          let splitLines: LineSplit[] = [];
          let index = 0;
          lines.forEach(line => {
            let rgx = new RegExp(`\(${input.value}\)`);
            splitLines.push({
              index: index++,
              matches: line.match(rgx) !== null,
              splits: line.split(rgx)
            });
          });

          // Malign will align against line with smallest splits, so get the
          // minimum number of split sections
          let nSections = Number.MAX_SAFE_INTEGER;
          splitLines.forEach(line => {
            // Get minimum number of nSections
            if (line.matches) {
              nSections = line.splits.length < nSections
                        ? line.splits.length
                        : nSections;
            }

            // WARNING: Malign assumes that if we get to this point,
            // `split.splits.length` will be greater than 1. This needs to be
            // verified and tested
            //
            // Trim the splits for processing later on. Start by right trimming
            // first value then regular trimming the rest
            line.splits[0] = line.splits[0].trimRight();
            for (let i = 1; i < line.splits.length; ++i) {
              line.splits[i] = line.splits[i].trim();
            }
          });

          // Get maximum split lengths
          let splitLengths = new Array<number>(nSections);
          splitLengths.fill(0);
          splitLines.forEach(line => {
            // Make sure this is a line that requires alignment
            if (line.splits.length <= 1) return;
            for (let i = 0; i < line.splits.length; ++i) {
              splitLengths[i] = line.splits[i].length > splitLengths[i]
                              ? line.splits[i].length
                              : splitLengths[i];
            }
          });

          // Align the line splits
          splitLines.forEach(line => {
            // Don't pad the final split
            for (let i = 0; i < splitLengths.length - 1; ++i) {
              line.splits[i] = line.splits[i].padEnd(splitLengths[i], ' ');
            }
          });
          let newLines = splitLines
            .map(line => line.splits.join(' '))
            .join('\n');

          eb.replace(sel, newLines);
        });
      });
    });
    input.show();
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
