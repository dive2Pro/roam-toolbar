import { initToolbar } from "./operator_toolbar";
import "./style.css";
import {
  CalloutDef,
  clearCallouts,
  DEFAULT_CALLOUT_CONFIG,
  syncCallouts,
} from "./callouts";

const switches: {
  smartblocks: boolean;
  calloutsEnabled: boolean;
  calloutConfig: string;
  callouts: CalloutDef[];
} = {
  smartblocks: false,
  calloutsEnabled: true,
  calloutConfig: "",
  callouts: [],
};

const refreshCallouts = () => {
  const raw = switches.calloutsEnabled
    ? switches.calloutConfig || DEFAULT_CALLOUT_CONFIG
    : "";
  syncCallouts(raw, switches);
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
        },
      },
      {
        id: "custom-callouts",
        name: "Custom Callouts",
        description:
          "Register custom callout types for the [!type] picker and the selection toolbar.",
        action: {
          type: "switch",
          onChange: (evt: any) => {
            switches.calloutsEnabled = evt["target"]["checked"];
            refreshCallouts();
          },
        },
      },
      {
        id: "custom-callout-types",
        name: "Callout Types",
        description:
          "Optional override. Separate entries with commas: type|color|icon. Example: recipe|#f778ba|🍳, tip|#1f883d|💡. Leave blank to use recipe, tip, and example.",
        action: {
          type: "input",
          onChange: (evt: any) => {
            const value =
              typeof evt === "string" ? evt : evt?.target?.value ?? "";
            switches.calloutConfig = value;
            refreshCallouts();
          },
        },
      },
    ],
  };

  extensionAPI.settings.panel.create(panelConfig);
  switches.smartblocks = extensionAPI.settings.get("smartblock-workflow");
  if (extensionAPI.settings.get("custom-callouts") == null) {
    try {
      extensionAPI.settings.set("custom-callouts", true);
    } catch (error) {
      console.error(error);
    }
  }
  switches.calloutsEnabled =
    extensionAPI.settings.get("custom-callouts") == null
      ? true
      : !!extensionAPI.settings.get("custom-callouts");
  switches.calloutConfig =
    extensionAPI.settings.get("custom-callout-types") || "";
  refreshCallouts();
  const toolbarUnload = initToolbar(switches);
  return () => {
    toolbarUnload();
    clearCallouts();
    switches.callouts = [];
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
  switches.calloutsEnabled = true;
  refreshCallouts();
  initToolbar(switches);
}
export default {
  onload,
  onunload,
};
