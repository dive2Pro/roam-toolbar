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

export function searchBlocksBy(text: string) {
  return (window.roamAlphaAPI.q(`
    [
        :find [?e ...]
        :where
            [?b :block/string ?t]
            [?b :block/uid ?e]
            [(clojure.string/includes? ?t "${text}")]
    ]
`) || []) as unknown as string[];
}

export function searchPagesBy(text: string) {
  return (window.roamAlphaAPI.q(`
    [
        :find [?e ...]
        :where
            [?b :node/title ?t]
            [?b :block/uid ?e]
            [(clojure.string/includes? ?t "${text}")]
    ]
`) || []) as unknown as string[];
}
