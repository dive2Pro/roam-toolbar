import { initToolbar } from "./OperatorToolbar";

let initial = (extensionAPI: any) => {
  const toolbarUnload = initToolbar();
  return () => {
    toolbarUnload();
  };
};

let initialed: Function;

function onload({ extensionAPI }: any) {
  initialed = initial(extensionAPI);
}

function onunload() {
  initialed?.();
}

export default {
  onload,
  onunload,
};
