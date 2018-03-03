import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application'

import {
  ICommandPalette,
  IFrame,
  IInstanceTracker,
  InstanceTracker
} from '@jupyterlab/apputils'

import {
  Token,
} from '@phosphor/coreutils';

import {
  Panel
} from '@phosphor/widgets';

export class IBGPanel extends Panel {
  private _frame: IFrame

  constructor() {
    super()
    this._frame = new IFrame()
    this.addWidget(this._frame)
  }

  get iframeNode() {
    return this.node.querySelector('iframe')
  }

  get url() {
    return this._frame.url
  }

  set url(url: string) {
    this._frame.url = url
  }
}

namespace Private {
  let counter = 0
  export const namespace = 'ibg-ext';

  export function createIBGPanel(gateway: string): IBGPanel {
    let frame = new IBGPanel()
    frame.id = `${namespace}-${++counter}`
    frame.title.label = gateway
    frame.title.closable = true
    frame.url = "/" + gateway + "/vnc"
    return frame
  }
}

/**
 * The command IDs used by the launcher plugin.
 */
namespace CommandIDs {
  export const create = 'ibg:create'
  export const restore = 'ibg:restore'
}

/**
 * A class that tracks IBG widgets.
 */
export interface IBGPanelTracker extends IInstanceTracker<IBGPanel>{}


/**
 * The editor tracker token.
 */
export const IBGPanelTracker = new Token<IBGPanelTracker>('jupyterlab_quantrocket_ibgui:IBGPanelTracker');

const extension: JupyterLabPlugin<IBGPanelTracker> = {
  id: 'jupyterlab_quantrocket_ibgui',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer],
  provides: IBGPanelTracker,
  activate: (app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer) => {
    const tracker = new InstanceTracker<IBGPanel>({ namespace: Private.namespace })

    // Handle state restoration.
    restorer.restore(tracker, {
      command: CommandIDs.restore,
      args: (widget) => ({gateway: widget.gateway}),
      name: () => Private.namespace
    });

    // not added to palette, only exists to reload page without modal creation
    app.commands.addCommand(CommandIDs.restore, {
      execute: (args) => {
        const gateway = args['gateway'] as string
        let frame = Private.createIBGPanel(gateway)
        tracker.add(frame)
        app.shell.addToMainArea(frame)
      }
    })

    app.commands.addCommand(CommandIDs.create, {
      label: 'IB Gateway GUI',
      execute: (args) => {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', '/launchpad/gateways');
          xhr.onload = function() {
              if (xhr.status == 200) {
                  let gateways = JSON.parse(xhr.responseText)
                  for (let gateway in gateways) {
                      let frame = Private.createIBGPanel(gateway)
                      tracker.add(frame)
                      app.shell.addToMainArea(frame)
                  }
                  return Promise.resolve()
              }
              else {
                  alert('Error retrieving list of IB Gateways: ' + xhr.status + ' ' + xhr.responseText);
              }
          };
          xhr.send();
      }
    })
    palette.addItem({ command: CommandIDs.create, category: 'QuantRocket' });
    return tracker
  }
};

export default extension;
