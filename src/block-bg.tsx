import {
  Button,
  Icon,
  IconSize,
  Menu,
  MenuItem,
  Popover,
  Tooltip,
} from "@blueprintjs/core";
import { useState, useEffect } from "react";

function debounce(func: Function, wait: number, immediate = false) {
  let timeout: ReturnType<typeof setTimeout>;

  return function () {
    const context = this;
    const args = arguments;

    const later = function () {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
}

const _start = async () => {
  const allBlocksWithProps = (window.roamAlphaAPI.q(`
[
    :find [(pull ?e [*])  ...]
    :where
        [?e :block/props ?p]
]
`) || []) as unknown as { props: { bg?: string }; uid: string }[];

  const allBlocksWithBgProp = allBlocksWithProps
    .filter((b) => b.props.bg)
    .map((block) => ({ id: block.uid, bg: block.props.bg }))
    .map((info) => {
      [...document.querySelectorAll(`[id$="${info.id}"]`)]
        .map((el) => {
          return el.closest(".roam-block-container");
        })
        .forEach((el) => {
          el.classList.remove("bp3-callout");
          el.className = el.className.replace(/bp3-intent-(\w+)(\s?)/gi, "");
          if(info.bg === 'none') {
            return
          }
          el.classList.add("bp3-callout");
          el.classList.add(`bp3-intent-${info.bg}`);
        });
      return info;
    });
  console.log(allBlocksWithBgProp, " --- ");
};
const start = debounce(_start, 250);
export const listenBlockChange = () => {
  // Select the target node you want to observe
  const targetNode = document.querySelector(".roam-app");

  // Options for the observer (e.g., observe changes to attributes and the subtree)
  const config = { attributes: true, childList: true, subtree: true };

  // Callback function to execute when a mutation is observed
  const callback = function (mutationsList: any[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        // console.log('hello2', mutation)
        const addedNodes = [...mutation.addedNodes];
        if (!addedNodes.length) {
          if (mutation.target.classList?.contains("rm-block-main")) {
            start();
          }
          return;
        }
        console.log(addedNodes);
        if (
          addedNodes.some((node) => node.id === "roam-right-sidebar-content") ||
          addedNodes.some(
            (n) =>
              n.classList &&
              (n.classList.contains?.("roam-block") ||
                n.classList.contains?.("roam-block-container"))
          ) ||
          addedNodes.some?.(
            (n) => n.parentElement.className === "sidebar-content"
          )
        ) {
          console.log("hello2", mutation);
          start();
        }
      }
    }
  };

  // Create a MutationObserver instance
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);
  return () => {
    observer.disconnect();
  };
};

const updateBlockBg = async (uid: string, bg: string) => {
  await window.roamAlphaAPI.updateBlock({
    block: {
      uid,
      // @ts-ignore
      props: {
        bg,
      },
    },
  });
  start();
};

export function BlockBg(props: { uid: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    start();
    // 监听页面上的变化
  }, []);
  return (
    <Popover
      isOpen={open}
      onClose={() => {
        setOpen(false);
      }}
      autoFocus={false}
      shouldReturnFocusOnClose={true}
      content={
        <Menu className="block-bg">
          <Button
            icon="font"
            alignText="left"
            intent="none"
            fill
            text="Default"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              updateBlockBg(props.uid, "none");
            }}
          />
          <Button
            icon="font"
            alignText="left"
            intent="primary"
            fill
            text="Primary"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              updateBlockBg(props.uid, "primary");
            }}
          />
          <Button
            icon="font"
            alignText="left"
            intent="success"
            fill
            text="Success"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              updateBlockBg(props.uid, "success");
            }}
          />
          <Button
            icon="font"
            alignText="left"
            intent="warning"
            fill
            text="Warning"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              updateBlockBg(props.uid, "warning");
            }}
          />

          <Button
            icon="font"
            alignText="left"
            intent="danger"
            fill
            text="Danger"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              updateBlockBg(props.uid, "danger");
            }}
          />
        </Menu>
      }
    >
      <Button
        icon="tint"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      />
    </Popover>
  );
}
