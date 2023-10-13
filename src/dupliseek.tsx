import {
  Button,
  ButtonGroup,
  Classes,
  Drawer,
  DrawerSize,
  Menu,
  MenuItem,
  Popover,
  Position,
  Tooltip,
} from "@blueprintjs/core";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
// 检查当前页面上的 block , 在 DB 中找到有相同字符串的 block
// 在右侧打开一个 Dialog, 上面是所有的查询结果 block
// 在结果 block 上提供选项,
//  1. 将焦点 block 切换为该 block 的 ref
//  2. 将结果替换掉焦点 block
function querySameTextBlocksByUid(uid: string) {
  return window.roamAlphaAPI.q(`
    [
        :find [?e ...]
        :where
            [?b1 :block/uid "${uid}"]
            [?b1 :block/string ?s1]
            [?b :block/string ?s]
            [?b :block/uid ?e]
            [(= ?s ?s1)]
    ]

`) as unknown as string[];
}

const CLAZZ = "DupliSeek-drawer";
function renderDrawer(uid: string) {
  let el = document.body.querySelector(`.${CLAZZ}`);
  if (!el) {
    el = document.createElement("div");
    document.body.appendChild(el);
  }
  ReactDOM.render(<DupliSeekDrawer uid={uid} />, el);
}

function DupliSeekDrawer(props: { uid: string }) {
  const [open, toggleOpen] = useState(true);

  return (
    <Drawer
      autoFocus={true}
      position="bottom"
      size={DrawerSize.SMALL}
      isOpen={open}
      onClose={() => toggleOpen(!open)}
      title="Duplication String Blocks"
    >
      <AllDupliBlocks uid={props.uid} />
    </Drawer>
  );
}

export function DupliSeek(props: { uid: string; onClick: () => void }) {
  return (
    <Tooltip content={"Seeking for duplication of this block"}>
      <Button
        icon="git-merge"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          renderDrawer(props.uid);
        }}
      />
    </Tooltip>
  );
}

function AllDupliBlocks(props: { uid: string }) {
  const [blocks, setBlocks] = useState<string[]>([]);
  const [loading, toggleLoading] = useState(true);
  useEffect(() => {
    const blocks = querySameTextBlocksByUid(props.uid);
    setBlocks(blocks);
    toggleLoading(false);
  }, [props.uid]);
  console.log(" render ---");
  return (
    <div className={Classes.DRAWER_BODY} style={{ padding: 8 }}>
      {loading ? (
        <div style={styles.container}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : blocks.length ? (
        <div style={styles.container}>
          {blocks.map((uid) => {
            return <Block key={uid} uid={uid} targetUid={props.uid} />;
          })}
        </div>
      ) : (
        <div>
          <h4>There are no dulication blocks</h4>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "row" as "row",
    gap: 8,
    height: "100%",
    overflow: "auto",
    padding: "2px",
  },
};

function SkeletonCard() {
  return (
    <div className={Classes.CARD} style={{ minWidth: 350 }}>
      <div className={Classes.SKELETON}>Hello</div>
      <div className={Classes.SKELETON}>Hello</div>
      <div className={Classes.SKELETON}>Hello</div>

      <br />

      <div className={Classes.SKELETON}>Hello</div>
      <div className={Classes.SKELETON}>Hello</div>

      <br />

      <div className={Classes.SKELETON}>Hello</div>
    </div>
  );
}

function Block(props: { uid: string; targetUid: string }) {
  const ref = useRef();
  useEffect(() => {
    window.roamAlphaAPI.ui.components.renderBlock({
      uid: props.uid,
      el: ref.current,
      // @ts-ignore
      "zoom-path?": true,
    });
  }, [props.uid]);

  return (
    <div
      className={Classes.CARD}
      style={{ minWidth: 350, padding: "5px 10px" }}
    >
      <div>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Popover
            interactionKind={"hover"}
            openOnTargetFocus={false}
            content={
              <Menu>
                <MenuItem
                  icon="exchange"
                  onClick={() => {
                    swapToReference(props.uid, props.targetUid);
                  }}
                  text={"Swap to reference"}
                ></MenuItem>
                <MenuItem
                  onClick={() => {
                    bringBlockTo(props.uid, props.targetUid);
                  }}
                  icon="exclude-row"
                  text={"Replace to block"}
                ></MenuItem>
              </Menu>
            }
          >
            <Button icon="more" minimal onFocus={(e) => e.target.blur()} />
          </Popover>
        </div>
      </div>
      <div ref={ref} />
    </div>
  );
}

function swapToReference(uid: string, targetUid: string) {
//   throw new Error("Function not implemented.");
    window.roamAlphaAPI.updateBlock({
        block: {
            uid: targetUid,
            string: `((${uid}))`
        }
    })
}

async function bringBlockTo(uid: string, targetUid: string) {
    // TODO: 获取父类的信息
    const block = window.roamAlphaAPI.q(`
        [
            :find (pull ?e [ { :block/parents  ...}:block/order :block/uid]) .
            :where
                [?e :block/uid "${targetUid}"]
        ]
        
    `) as any;
     await window.roamAlphaAPI.deleteBlock({
       block: {
         uid: targetUid,
       },
     });
    await window.roamAlphaAPI.moveBlock({
        location: {
            "parent-uid": block.parents.pop().uid,
            order: block.order
        },
        block: {
            uid: uid
        }
    })
   
}
