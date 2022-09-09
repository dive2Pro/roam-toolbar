import { initToolbar } from "./OperatorToolbar";

const switches = {
  smartblocks: true,
};
let initial = (extensionAPI: any) => {
  const panelConfig = {
    tabTitle: "Custom Toolbar",
    settings: [
      {
        id: "smartblock-workflow",
        name: "SmartBlock Workflow",
        description:
          "Enable to add a button that will trigger all installed smartblock workflow",
        action: {
          type: "switch",
          onChange: (evt: any) => {
            switches.smartblocks = evt["target"]["checked"];
          },
        }
      },
    ],
  };
  extensionAPI.settings.panel.create(panelConfig);
  extensionAPI.settings.set('smartblock-workflow', true);
  const toolbarUnload = initToolbar(switches);
  return () => {
    toolbarUnload();
  };
};

let initialed = () => {};
function onload({ extensionAPI }: any) {
  initialed = initial(extensionAPI);
}

function onunload() {
  initialed();
}

if (!process.env.ROAM_DEPOT) {
  initToolbar(switches);
}
export default {
  onload,
  onunload,
};
