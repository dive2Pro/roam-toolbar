import { initToolbar } from "./OperatorToolbar";

let initial = (extensionAPI: any) => {
  const toolbarUnload = initToolbar();
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
  initToolbar();
}
export default {
  onload,
  onunload,
};
