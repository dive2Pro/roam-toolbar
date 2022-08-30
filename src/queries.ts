import { ActionParams } from "roamjs-components/types";

export const getBlock = (uid: string) => {
  return window.roamAlphaAPI.data.pull("[*]", [":block/uid", uid]);
};

export const updateBlock = async (params: ActionParams) => {
  await window.roamAlphaAPI.data.block.update({
    ...params,
  });
};

export const updateStr = async (uid: string, str: string) => {
  return updateBlock({
    block: {
      uid,
      string: str,
    },
  });
};
