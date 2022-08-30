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
const delay = async (m: number) =>
  new Promise((resolve) => setTimeout(resolve, m));

const INPUT_SELECTOR = "textarea.rm-block-input";
/**
 * returns x, y coordinates for absolute positioning of a span within a given text input
 * at a given selection point
 * @param {object} input - the input element to obtain coordinates for
 * @param {number} selectionPoint - the selection point for the input
 */
const getCursorXY = (input: HTMLInputElement, selectionPoint: number) => {
  //   const { offsetLeft: inputX, offsetTop: inputY } = input;
  const inputX = input.getBoundingClientRect().left;
  const inputY = input.getBoundingClientRect().top;
  // create a dummy element that will be a clone of our input
  const div = document.createElement("div");
  // get the computed style of the input and clone it onto the dummy element
  const copyStyle = getComputedStyle(input);
  for (const prop of copyStyle) {
    // @ts-ignore
    div.style[prop] = copyStyle[prop];
  }

  div.style.position = "fixed";
  div.style.top = inputY + "px";
  div.style.left = inputX + "px";
  // we need a character that will replace whitespace when filling our dummy element if it's a single line <input/>
  const swap = ".";
  const inputValue =
    input.tagName === "INPUT" ? input.value.replace(/ /g, swap) : input.value;
  // set the div content to that of the textarea up until selection
  const textContent = inputValue.substr(0, selectionPoint);
  // set the text content of the dummy element div
  div.textContent = textContent;
  if (input.tagName === "TEXTAREA") div.style.height = "auto";
  // if a single line input then the div needs to be single line and not break out like a text area
  if (input.tagName === "INPUT") div.style.width = "auto";
  // create a marker element to obtain caret position
  const span = document.createElement("span");
  // give the span the textContent of remaining content so that the recreated dummy element is as close as possible
  span.textContent = inputValue.substr(selectionPoint) || ".";
  // append the span marker to the div
  div.appendChild(span);
  // append the dummy element to the body
  document.body.appendChild(div);
  // get the marker position, this is the caret position top and left relative to the input
  const { offsetLeft: spanX, offsetTop: spanY } = span;
  // lastly, remove that dummy element
  // NOTE:: can comment this out for debugging purposes if you want to see where that span is rendered
  document.body.removeChild(div);
  // return an object with the x and y of the caret. account for input positioning so that you don't need to wrap the input
  //   console.log(inputY, spanY, " - x - x");
  return {
    x: inputX + spanX,
    y: inputY + spanY,
  };
};
const KEYS = "*_^~`".split("");
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

      const isIntent = (b: boolean, target = "primary"): Intent =>
        (b ? target : "none") as Intent;

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
      };
      const unHeader = () => {
        headering(0);
      };
      const headering = async (heading: number) => {
        await window.roamAlphaAPI.data.block.update({
          block: {
            uid: focusedBlock["block-uid"],
            heading,
          },
        });
      };
      return (
        <ButtonGroup>
          <Popover
            interactionKind="hover"
            onClosed={reFocus}
            content={
              <>
                <Menu>
                  <MenuItem
                    icon="paragraph"
                    text="text"
                    intent="primary"
                    onClick={() => {
                      unHeader();
                    }}
                  />
                  <MenuItem
                    icon="header-one"
                    text="H1"
                    onClick={() => {
                      headering(1);
                    }}
                  />
                  <MenuItem
                    icon="header-two"
                    text="H2"
                    onClick={() => {
                      headering(2);
                    }}
                  />
                  <MenuItem
                    icon="header-three"
                    text="H3"
                    onClick={() => headering(3)}
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
    const onSelectionChange = () => {
      const xy = getCursorXY(t, t.selectionStart);
      el.style.top = xy.y - 35 + "px";
      el.style.left = xy.x - 0 + "px";
      ({ selectionStart, selectionEnd } = t);
      if (t.selectionStart === t.selectionEnd) {
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
              await window.roamAlphaAPI.data.block.update({
                block: {
                  uid: focusedBlock["block-uid"],
                  string: afterString,
                },
              });
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
