require("arrive");
import ReactDOM from "react-dom";
import {
  Button,
  ButtonGroup,
  Icon,
  Tooltip,
  Position,
  Intent,
  Menu,
  MenuItem,
  Popover,
} from "@blueprintjs/core";
import React from "react";
import { getCursorXY } from "./getCursorXY";
import { getBlock, updateStr } from "./queries";
const delay = async (m: number) =>
  new Promise((resolve) => setTimeout(resolve, m));

const INPUT_SELECTOR = "textarea.rm-block-input";
const KEYS = [..."*_^~`".split("")];

const isIntent = (b: boolean, target = "primary"): Intent =>
  (b ? target : "none") as Intent;

export function initToolbar() {
  let stop = () => {};
  console.log("initToolbar");
  let selection = window.getSelection();
  const start = (t: HTMLInputElement) => {
    el.style.position = "fixed";
    let { selectionStart, selectionEnd } = t;
    function Toolbar(props: {
      position: { top: number; left: number };
      text: string;
      onAfter: (t: string, selection?: { start: number; end: number }) => void;
    }) {
      const styleModeToggle = (source: string, tag: string, length = 2) => {
        const unstyle = () => {
          const afterText = source
            .split("")
            .filter((s, i, origin) => {
              return !(
                activeIndex === i ||
                (i > activeIndex && i < activeIndex + length) ||
                (i >= origin.length - activeIndex - length &&
                  i < origin.length - activeIndex)
              );
            })
            .join("");

          props.onAfter(afterText);
        };
        const isStartAndEndWith = (source: string, tag: string, length = 2) => {
          let started = false;
          for (let i = 0, l = source.length - 1; i < l; i++, l--) {
            if (KEYS.every((k) => k !== source[i])) {
              return -1;
            }
            if (source[i] === tag && source[l] === tag) {
              if (length === 1) {
                return i;
              }
              if (started) {
                return i - 1;
              } else {
                started = true;
              }
            } else if (!started) {
              continue;
            } else {
              return -1;
            }
          }
          return -1;
        };

        const activeIndex = isStartAndEndWith(source, tag, length);
        const isActive = activeIndex !== -1;
        const affix = new Array(length).fill(tag).join("");
        return {
          isActive,
          toggle: () => {
            isActive
              ? unstyle()
              : props.onAfter(`${affix}${props.text}${affix}`);
          },
        };
      };

      const pageReferenceToggle = {
        toggle: () => {
          const text = `[[${props.text}]]`;
          props.onAfter(text, {
            start: text.length - 2,
            end: text.length - 2,
          });
        },
      };
      const highlightToggle = styleModeToggle(props.text, "^");
      const boldingToggle = styleModeToggle(props.text, "*");
      const italicToggle = styleModeToggle(props.text, "_");
      const codeToggle = styleModeToggle(props.text, "`", 1);
      const strikethroughToggle = styleModeToggle(props.text, "~");

      const blockMemu = () => {};
      const reFocus = async () => {
        await window.roamAlphaAPI.ui.setBlockFocusAndSelection({
          location: focusedBlock,
          selection: {
            start: selectionStart,
            end: selectionEnd,
          },
        });
        block = getBlock(focusedBlock["block-uid"]);
      };
      const unHeader = () => {
        headering(0);
      };
      const unQuotation = () => {
        if (isQuotation()) {
          quotation();
        }
      };
      const quotation = async () => {
        let content = block[":block/string"];
        if (isQuotation()) {
          content = content.substring(2);
          selectionStart -= 2;
          selectionEnd -= 2;
        } else {
          content = `> ${content}`;
          selectionStart += 2;
          selectionEnd += 2;
        }
        await updateStr(block[":block/uid"], content);
      };
      const headering = async (heading: number) => {
        if (isHeading(heading)) {
          unHeader();
          return;
        }
        await window.roamAlphaAPI.data.block.update({
          block: {
            uid: focusedBlock["block-uid"],
            heading,
          },
        });
      };

      const toPlain = () => {
        unHeader();
        unQuotation();
      };

      return (
        <ButtonGroup>
          <Popover
            interactionKind="click"
            onClosed={reFocus}
            content={
              <>
                <Menu>
                  <MenuItem
                    icon="paragraph"
                    text="text"
                    intent={isIntent(isPlain())}
                    onClick={() => {
                      toPlain();
                    }}
                    active={isPlain()}
                  />
                  <MenuItem
                    icon="header-one"
                    text={"H1"}
                    onClick={() => {
                      headering(1);
                    }}
                    active={isHeading(1)}
                  />
                  <MenuItem
                    icon="header-two"
                    text={"H2"}
                    active={isHeading(2)}
                    onClick={() => {
                      headering(2);
                    }}
                  />
                  <MenuItem
                    active={isHeading(3)}
                    icon="header-three"
                    text="H3"
                    onClick={() => headering(3)}
                  />
                  <MenuItem
                    active={isQuotation()}
                    icon="citation"
                    text="Quote"
                    onClick={() => quotation()}
                  />
                </Menu>
              </>
            }
          >
            <Button icon="header">
              <Icon icon="chevron-down" size={14} style={{ color: "grey" }} />
            </Button>
          </Popover>
          <Button
            onClick={highlightToggle.toggle}
            intent={isIntent(highlightToggle.isActive)}
            icon="highlight"
          />
          <Tooltip
            content={
              <>
                <Icon icon="key-command"></Icon>+ B
              </>
            }
            position={Position.TOP}
            openOnTargetFocus={false}
          >
            <Button
              onClick={boldingToggle.toggle}
              intent={isIntent(boldingToggle.isActive)}
              icon="bold"
            />
          </Tooltip>
          <Button
            onClick={codeToggle.toggle}
            intent={isIntent(codeToggle.isActive)}
            icon="code"
          />
          <Button
            onClick={italicToggle.toggle}
            intent={isIntent(italicToggle.isActive)}
            icon="italic"
          />
          <Button
            onClick={strikethroughToggle.toggle}
            intent={isIntent(strikethroughToggle.isActive)}
            icon="strikethrough"
          />
        </ButtonGroup>
      );
    }

    const focusedBlock = window.roamAlphaAPI.ui.getFocusedBlock();
    let block = getBlock(focusedBlock["block-uid"]);

    const isHeading = (heading: number) => {
      return block[":block/heading"] === heading;
    };

    const isQuotation = () => {
      return block[":block/string"].startsWith(">");
    };

    const isPlain = () => {
      return block[":block/heading"] === undefined && !isQuotation();
    };

    const onSelectionChange = () => {
      const xy = getCursorXY(t, t.selectionStart);
      el.style.top = xy.y - 35 + "px";
      el.style.left = xy.x - 0 + "px";
      ({ selectionStart, selectionEnd } = t);
      if (selectionStart === selectionEnd) {
        return ReactDOM.unmountComponentAtNode(el);
      }
      const fullContent = t.value;
      const text = selection.toString();
      ReactDOM.render(
        <Toolbar
          text={text}
          position={{ top: xy.y, left: xy.x }}
          onAfter={async (text, selection = { start: 0, end: 0 }) => {
            const afterString =
              fullContent.substring(0, selectionStart) +
              text +
              fullContent.substring(selectionEnd);

            setTimeout(async () => {
              await updateStr(focusedBlock["block-uid"], afterString);
              await delay(10);
              await window.roamAlphaAPI.ui.setBlockFocusAndSelection({
                location: focusedBlock,
                selection: {
                  start: selectionStart + selection.start,
                  end: selectionStart + text.length + selection.end,
                },
              });
            });
          }}
        />,
        el
      );
    };

    // const onMouseUp = () => {
    //   if (!selection.isCollapsed) {
    // el.style.display = "block";
    //   }
    // };

    // const onMouseDown = () => {
    //   el.style.display = "none";
    // };

    // document.addEventListener("mousedown", onMouseDown);
    // document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    stop = () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      //   document.removeEventListener("mouseup", onMouseUp);
      //   document.removeEventListener("mousedown", onMouseDown);
    };
  };
  const el = document.createElement("div");
  document.body.appendChild(el);
  document.arrive(INPUT_SELECTOR, start);
  return () => {
    try {
      stop();
      document.body.removeChild(el);
      document.unbindArrive(INPUT_SELECTOR, start);
    } catch (e) {}
  };
}
