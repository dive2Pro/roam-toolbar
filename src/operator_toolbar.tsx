import "arrive";
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
  Classes,
  CollapsibleList,
  MenuItemProps,
  Divider,
} from "@blueprintjs/core";
import React, { useEffect, useRef, useState } from "react";
import { getCursorXY } from "./getCursorXY";
import {
  getBlock,
  getParentsStringFromBlockUid,
  searchBlocksBy,
  searchPagesBy,
  updateStr,
} from "./queries";
import { getVisibleCustomWorkflows, PREDEFINED_REGEX } from "./smartblocks";
import { VariableSizeList as List } from "react-window";
import { PullBlock } from "roamjs-components/types";
import { HighlightText } from "./highlight_spans";
import { DupliSeek } from "./dupliseek";
import { BlockBg } from "./block-bg";

const delay = async (m: number) =>
  new Promise((resolve) => setTimeout(resolve, m));

const useEvent = <T, K>(cb: (...args: T[]) => K) => {
  const ref = useRef((...args: T[]) => {
    return cbRef.current(...args);
  });

  const cbRef = useRef(cb);
  cbRef.current = cb;

  return ref.current;
};

const INPUT_SELECTOR = "textarea.rm-block-input";
const KEYS = [..."*_^~`[]()".split("")];

const NoFound = (props: { children: any }) => {
  return (
    <div style={{ padding: 16, textAlign: "center" }}>
      <div>
        <Icon icon="search" size={16} />
      </div>
      {props.children}
    </div>
  );
};
const isIntent = (b: boolean, target = "primary"): Intent =>
  (b ? target : "none") as Intent;

const isStartAndEndWith = (
  source: string,
  tag: string | [string, string],
  length = 2
) => {
  let started = false;
  const ptag = Array.isArray(tag) ? tag[0] : tag;
  const ltag = Array.isArray(tag) ? tag[1] : tag;
  for (let i = 0, l = source.length - 1; i < l; i++, l--) {
    if (KEYS.every((k) => k !== source[i])) {
      return -1;
    }
    if (source[i] === ptag && source[l] === ltag) {
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

const removeFormat = (source: string, position: number) =>
  source
    .split("")
    .filter((s, i, origin) => {
      return !(
        position === i ||
        (i > position && i < position + length) ||
        (i >= origin.length - position - length && i < origin.length - position)
      );
    })
    .join("");

function SearchBlockItem(props: { block: PullBlock; highlight: string }) {
  const [parents, setParents] = useState([]);
  useEffect(() => {
    const v = getParentsStringFromBlockUid(props.block[":block/uid"]);
    setParents(v);
  }, []);

  return (
    <div className="search-block-item">
      <CollapsibleList
        className={Classes.BREADCRUMBS}
        visibleItemCount={parents.length}
        visibleItemRenderer={(props: MenuItemProps) => (
          <span className={Classes.BREADCRUMB}>{props.text}</span>
        )}
      >
        {parents.map((str) => (
          <MenuItem text={str} />
        ))}
      </CollapsibleList>
      <HighlightText
        highlight={props.highlight}
        text={props.block[":block/string"]}
      />
    </div>
  );
}

export function initToolbar(switches: { smartblocks: boolean }) {
  let stop = () => {};
  console.log("initToolbar");
  let selection = window.getSelection();
  let prevSelection: [number, number];
  const start = async (input: HTMLInputElement) => {
    stop();
    await delay(10);
    let prevValue = "";
    // el.style.display = 'flex'
    let { selectionStart, selectionEnd } = input;
    input.addEventListener("change", (e) => {
      // console.log(e, ' change')
      prevValue = (e.target as any).value;
    });

    function Search(props: { text: string; onChange: (s: string) => void }) {
      const [isOpen, setOpen] = useState(false);
      const search = () => {
        return {
          blocks: searchBlocksBy(props.text)
            .filter((uid) => {
              return uid !== block[":block/uid"];
            })
            .map((uid) => {
              return window.roamAlphaAPI.pull("[*]", [":block/uid", uid]);
            }),
          pages: searchPagesBy(props.text).map((uid) => {
            return window.roamAlphaAPI.pull("[*]", [":block/uid", uid]);
          }),
        };
      };
      const [{ blocks, pages }, setData] = useState({
        blocks: [],
        pages: [],
      });
      const totalLines = [...pages, ...blocks];
      const operated = useRef(false);
      const openOnSidebar = (uid: string, type: "outline" | "block") => {
        window.roamAlphaAPI.ui.rightSidebar.addWindow({
          window: {
            "block-uid": uid,
            type,
          },
        });
        setTimeout(() => {
          unmount();
        }, 250);
      };
      const Row = ({ index, style }: { index: number; style: object }) => {
        if (index <= pages.length - 1) {
          return (
            <MenuItem
              style={style}
              text={
                <HighlightText
                  highlight={props.text}
                  text={totalLines[index][":node/title"]}
                />
              }
              icon="document"
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  return openOnSidebar(
                    totalLines[index][":block/uid"],
                    "outline"
                  );
                }
                setOpen(false);
                operated.current = true;
                props.onChange(`[[${totalLines[index][":node/title"]}]]`);
              }}
            ></MenuItem>
          );
        }
        return (
          <MenuItem
            style={style}
            icon="dot"
            text={
              <SearchBlockItem
                block={totalLines[index]}
                highlight={props.text}
              />
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.shiftKey) {
                return openOnSidebar(totalLines[index][":block/uid"], "block");
              }
              operated.current = true;
              setOpen(false);
              props.onChange(`((${totalLines[index][":block/uid"]}))`);
            }}
          ></MenuItem>
        );
      };
      return (
        <Popover
          isOpen={isOpen}
          autoFocus={false}
          onClose={() => {
            setOpen(false);
            setTimeout(() => {
              if (!operated.current) {
              }
              operated.current = false;
            }, 100);
          }}
          content={
            totalLines.length ? (
              <section>
                <div></div>
                <Menu>
                  <List
                    height={Math.min(450, totalLines.length * 60)}
                    itemCount={blocks.length + pages.length}
                    itemSize={(index) => (index < pages.length ? 35 : 60)}
                    width={500}
                  >
                    {Row}
                  </List>
                </Menu>
              </section>
            ) : (
              <NoFound>No references</NoFound>
            )
          }
        >
          <Button
            icon="search"
            intent={isOpen ? "primary" : "none"}
            onClick={(e) => {
              e.stopPropagation();
              if (isOpen) {
                setOpen(false);
              } else {
                setData(search());
                setOpen(true);
              }
              input.focus();
            }}
          />
        </Popover>
      );
    }

    function StyleEraser(props: {
      text: string;
      onChange: (text: string) => void;
    }) {
      // 检查文本中是否包含任何样式标记
      const hasStyles = (text: string): boolean => {
        return (
          // 检查嵌入标记
          /\{\{(\[\[)?embed(-path)?(\]\])?:?\s*([^}]+)\}\}/.test(text) ||
          // 检查页面链接标记
          /\[\[([^\]]+)\]\]/.test(text) ||
          // 检查块引用标记
          /\(\(([^)]+)\)\)/.test(text) ||
          // 检查高亮标记
          /\^{2}([^^]+)\^{2}/.test(text) ||
          // 检查粗体标记
          /\*{2}([^*]+)\*{2}/.test(text) ||
          // 检查斜体标记
          /_{2}([^_]+)_{2}/.test(text) ||
          // 检查删除线标记
          /~{2}([^~]+)~{2}/.test(text) ||
          // 检查代码标记
          /`([^`]+)`/.test(text) ||
          // 检查引用标记（多行模式）
          /^>\s*/m.test(text)
        );
      };

      const removeAllStyles = (text: string): string => {
        let result = text;
        let previousResult = "";

        // 循环处理直到没有更多标记被移除（处理嵌套情况）
        while (result !== previousResult) {
          previousResult = result;

          // 移除嵌入标记 {{embed: ...}} 或 {{[[embed]]: ...}} 或 {{[[embed-path]]: ...}}
          result = result.replace(
            /\{\{(\[\[)?embed(-path)?(\]\])?:?\s*([^}]+)\}\}/g,
            (match, p1, p2, p3, content) => {
              return content.trim();
            }
          );

          // 移除页面链接标记 [[...]]
          result = result.replace(/\[\[([^\]]+)\]\]/g, (match, content) => {
            return content;
          });

          // 移除块引用标记 ((...))
          result = result.replace(/\(\(([^)]+)\)\)/g, (match, content) => {
            return content;
          });

          // 移除高亮标记 ^^...^^ (两个插入符号)
          result = result.replace(/\^{2}([^^]+)\^{2}/g, (match, content) => {
            return content;
          });

          // 移除粗体标记 **...** (两个星号)
          result = result.replace(/\*{2}([^*]+)\*{2}/g, (match, content) => {
            return content;
          });

          // 移除斜体标记 __...__ (两个下划线)
          result = result.replace(/_{2}([^_]+)_{2}/g, (match, content) => {
            return content;
          });

          // 移除删除线标记 ~~...~~ (两个波浪号)
          result = result.replace(/~{2}([^~]+)~{2}/g, (match, content) => {
            return content;
          });

          // 移除代码标记 `...` (单个反引号)
          result = result.replace(/`([^`]+)`/g, (match, content) => {
            return content;
          });
        }

        // 移除引用标记 > (仅在行首)
        result = result.replace(/^>\s*/gm, "");

        return result;
      };

      const hasActiveStyles = hasStyles(props.text);

      return (
        <Tooltip content={"style eraser"} position={Position.TOP}>
          <Button
            intent={isIntent(hasActiveStyles)}
            icon="eraser"
            onClick={(e) => {
              e.stopPropagation();
              const cleanedText = removeAllStyles(props.text);
              props.onChange(cleanedText);
            }}
          />
        </Tooltip>
      );
    }
    function Smartblocks(props: { uid: string }) {
      const [workflows, setWorkflows] = useState<
        { uid: string; name: string }[]
      >([]);

      const [activeIndex, setActiveIndex] = useState(-1);
      const onSelect = (i: number) => {
        window.roamjs.extension.smartblocks.triggerSmartblock({
          srcName: workflows[i].name,
          targetUid: props.uid,
        });
        setTimeout(() => {
          onClose();
          unmount();
        }, 350);
      };
      const [isOpen, setOpen] = useState(false);
      const onClose = () => setOpen(false);

      const keydownListener = useEvent((e: KeyboardEvent) => {
        const count = workflows.length;
        if (e.key === "ArrowDown") {
          setActiveIndex((activeIndex + 1) % count);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === "ArrowUp") {
          setActiveIndex((activeIndex - 1 + count) % count);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key == "ArrowLeft" || e.key === "ArrowRight") {
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === "Enter") {
          onSelect(activeIndex);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === "Escape") {
          onClose();
        } else {
        }
        requestIdleCallback(() => {
          document.querySelector(".bp3-active")?.scrollIntoView({
            block: "nearest",
          });
        });
      });
      const menuRef = useRef<Menu>();
      useEffect(() => {
        const listeningEl = el;
        listeningEl.addEventListener("keydown", keydownListener);
        return () => {
          listeningEl.removeEventListener("keydown", keydownListener);
        };
      }, [menuRef.current]);

      return (
        <Popover
          isOpen={isOpen}
          onClose={onClose}
          interactionKind="click"
          modifiers={{
            flip: { enabled: false },
            preventOverflow: { enabled: false },
          }}
          position={Position.BOTTOM_LEFT}
          autoFocus={false}
          content={
            workflows.length ? (
              <Menu
                className="roamjs-smartblock-menu"
                ref={menuRef}
                style={{
                  maxHeight: 350,
                  overflowY: "auto",
                }}
              >
                {workflows.map((wf, i) => {
                  return (
                    <MenuItem
                      key={wf.uid}
                      data-uid={wf.uid}
                      data-name={wf.name}
                      text={
                        <>
                          <img
                            src={
                              PREDEFINED_REGEX.test(wf.uid)
                                ? "https://raw.githubusercontent.com/dvargas92495/roamjs-smartblocks/main/src/img/gear.png"
                                : "https://raw.githubusercontent.com/dvargas92495/roamjs-smartblocks/main/src/img/lego3blocks.png"
                            }
                            alt={""}
                            width={15}
                            style={{ marginRight: 4 }}
                          />
                          {wf.name
                            .split(/<b>(.*?)<\/b>/)
                            .map((part, i) =>
                              i % 2 === 1 ? (
                                <b key={i}>{part}</b>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                        </>
                      }
                      active={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => onSelect(i)}
                    />
                  );
                })}
              </Menu>
            ) : (
              <NoFound>No custom smartblock</NoFound>
            )
          }
        >
          <Button
            onClick={() => {
              setOpen(true);
              setWorkflows(getVisibleCustomWorkflows());
            }}
            icon={
              <img
                src="https://raw.githubusercontent.com/8bitgentleman/roam-depot-mobile-bottombar/main/icon.png"
                style={{ height: 16, width: 16 }}
              />
            }
          />
        </Popover>
      );
    }

    function SentToDailyNoteThenPutReferenceHere(porps: {
      uid: string;
      text: string;
      onChange: (str: string) => void;
    }) {
      return (
        <Tooltip
          content={"Send selection to Daily Notes and leave a block reference"}
          position={Position.BOTTOM}
        >
          <Button
            icon="send-to"
            onClick={async (e) => {
              e.stopPropagation();
              const uid = window.roamAlphaAPI.util.generateUID();
              await window.roamAlphaAPI.createBlock({
                block: {
                  string: porps.text,
                  uid,
                },
                location: {
                  "parent-uid": window.roamAlphaAPI.util.dateToPageUid(
                    new Date()
                  ),
                  order: Number.MAX_SAFE_INTEGER,
                },
              });
              await delay(10);
              porps.onChange(`((${uid}))`);
            }}
          />
        </Tooltip>
      );
    }

    function Toolbar(props: {
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

        const activeIndex = isStartAndEndWith(source, tag, length);

        const isActive = activeIndex !== -1;
        const affix = new Array(length).fill(tag).join("");
        return {
          isActive,
          toggle: (e: React.MouseEvent) => {
            e.stopPropagation();

            isActive
              ? unstyle()
              : props.onAfter(`${affix}${props.text}${affix}`);
            // reFocus();
          },
        };
      };

      const highlightToggle = styleModeToggle(props.text, "^");
      const boldingToggle = styleModeToggle(props.text, "*");
      const italicToggle = styleModeToggle(props.text, "_");
      const codeToggle = styleModeToggle(props.text, "`", 1);
      const strikethroughToggle = styleModeToggle(props.text, "~");

      const unHeader = () => {
        headering(0);
      };
      const unQuotation = () => {
        if (isQuotation()) {
          quotation();
        }
      };
      const quotation = async () => {
        let content = input.value;
        if (isQuotation()) {
          content = content.substring(2);
        } else {
          content = `> ${content}`;
        }
        prevValue = content;
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

      const PageTransform = () => {
        const index = isStartAndEndWith(props.text, ["[", "]"]);
        const pageUnbracket =
          index > -1 ? (
            <>
              <Tooltip content="Un Bracket">
                <Button
                  onClickCapture={(e) => {
                    e.stopPropagation();
                    const afterText = props.text.replace(
                      /^\[\[(.+)\]\]/g,
                      "$1"
                    );
                    props.onAfter(afterText);
                  }}
                  icon="square"
                ></Button>
              </Tooltip>
            </>
          ) : null;
        return (
          <>
            {pageUnbracket}
            <Tooltip content="Page Bracket">
              <Button
                onClickCapture={(e) => {
                  e.stopPropagation();
                  props.onAfter(`[[${props.text}]]`);
                }}
                icon="array"
              ></Button>
            </Tooltip>
          </>
        );
      };

      const EmbedTransform = () => {
        if (
          isStartAndEndWith(props.text, ["[", "]"]) > -1 ||
          isStartAndEndWith(props.text, ["(", ")"]) > -1
        ) {
          return (
            <Tooltip content="Block Embed">
              <Button
                icon="new-layers"
                onClickCapture={(e) => {
                  e.stopPropagation();
                  props.onAfter(`{{[[embed]]: ${props.text}}}`);
                }}
              ></Button>
            </Tooltip>
          );
        }
        if (isStartAndEndWith(props.text, ["{", "}"]) > -1) {
          return null;
        }
        if (
          !props.text.startsWith("{{embed:") &&
          !props.text.startsWith("{{[[embed]]:")
        ) {
          return null;
        }

        return (
          <Tooltip content="Block Reference">
            <Button
              icon="layer"
              onClickCapture={(e) => {
                e.stopPropagation();
                const index = props.text.indexOf(":");
                props.onAfter(
                  props.text.substring(index + 1, props.text.length - 2).trim()
                );
              }}
            ></Button>
          </Tooltip>
        );
      };

      const PathEmbedTransform = () => {
        `{{embed-path: ((CfXXH7HJp))}}`;
        if (isStartAndEndWith(props.text, ["(", ")"]) > -1) {
          return (
            <Tooltip content="Block Embed Path">
              <Button
                icon="new-layer"
                onClickCapture={(e) => {
                  e.stopPropagation();
                  props.onAfter(`{{[[embed-path]]: ${props.text}}}`);
                }}
              ></Button>
            </Tooltip>
          );
        }

        if (isStartAndEndWith(props.text, ["{", "}"]) > -1) {
          return null;
        }

        if (
          !props.text.startsWith("{{embed-path:") &&
          !props.text.startsWith("{{[[embed-path]]:")
        ) {
          return null;
        }
        return (
          <Tooltip content="Block Reference">
            <Button
              icon="layer"
              onClick={(e) => {
                e.stopPropagation();
                const index = props.text.indexOf(":");
                props.onAfter(
                  props.text.substring(index + 1, props.text.length - 2).trim()
                );
              }}
            ></Button>
          </Tooltip>
        );
      };

      return (
        <ButtonGroup className="rm-toolbar">
          <Popover
            interactionKind="hover"
            autoFocus={false}
            content={
              <>
                <Menu>
                  <MenuItem
                    icon="paragraph"
                    text="text"
                    intent={isIntent(isPlain())}
                    onClick={(e) => {
                      toPlain();
                      unmount();
                    }}
                    active={isPlain()}
                  />
                  <MenuItem
                    icon="header-one"
                    text={"H1"}
                    onClick={() => {
                      headering(1);
                      unmount();
                    }}
                    active={isHeading(1)}
                  />
                  <MenuItem
                    icon="header-two"
                    text={"H2"}
                    active={isHeading(2)}
                    onClick={() => {
                      headering(2);
                      unmount();
                    }}
                  />
                  <MenuItem
                    active={isHeading(3)}
                    icon="header-three"
                    text="H3"
                    onClick={() => {
                      headering(3);
                      unmount();
                    }}
                  />
                  <MenuItem
                    active={isQuotation()}
                    icon="citation"
                    text="Quote"
                    onClick={() => {
                      quotation();
                      unmount();
                    }}
                  />
                </Menu>
              </>
            }
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
              }}
              icon={
                isHeading(1)
                  ? "header-one"
                  : isHeading(2)
                  ? "header-two"
                  : isHeading(3)
                  ? "header-three"
                  : isQuotation()
                  ? "citation"
                  : "paragraph"
              }
            >
              <Icon icon="chevron-down" size={14} style={{ color: "grey" }} />
            </Button>
          </Popover>
          <PageTransform />
          <EmbedTransform />
          <PathEmbedTransform />
          <Tooltip content={"highlight"} position={Position.TOP}>
            <Button
              onClick={highlightToggle.toggle}
              intent={isIntent(highlightToggle.isActive)}
              icon="highlight"
            />
          </Tooltip>
          <Tooltip content={"bold"} position={Position.TOP}>
            <Button
              onClickCapture={boldingToggle.toggle}
              intent={isIntent(boldingToggle.isActive)}
              icon="bold"
            />
          </Tooltip>

          <Tooltip content={"code"} position={Position.TOP}>
            <Button
              onClick={codeToggle.toggle}
              intent={isIntent(codeToggle.isActive)}
              icon="code"
            />
          </Tooltip>

          <Tooltip content={"italic"} position={Position.TOP}>
            <Button
              onClick={italicToggle.toggle}
              intent={isIntent(italicToggle.isActive)}
              icon="italic"
            />
          </Tooltip>

          <Tooltip content={"strikethrough"} position={Position.TOP}>
            <Button
              onClick={strikethroughToggle.toggle}
              intent={isIntent(strikethroughToggle.isActive)}
              icon="strikethrough"
            />
          </Tooltip>
          <StyleEraser text={props.text} onChange={props.onAfter} />
          {/* <BlockBg uid={focusedBlock["block-uid"]} /> */}
          <SentToDailyNoteThenPutReferenceHere
            uid={focusedBlock["block-uid"]}
            onChange={props.onAfter}
            text={props.text}
          />
          {/* <DupliSeek
            uid={focusedBlock["block-uid"]}
            onClick={() => {
              stop();
            }}
          /> */}

          {switches.smartblocks ? (
            <Smartblocks uid={focusedBlock["block-uid"]} />
          ) : null}
          {/* {<Search text={props.text} onChange={props.onAfter} />} */}
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
    const changeElPosition = () => {
      const xy = getCursorXY(input, [input.selectionStart, input.selectionEnd]);
      el.style.top = xy.y + 5 + "px";
      el.style.left = xy.x - 0 + "px";
    };
    const unmount = () => {
      ReactDOM.unmountComponentAtNode(el);
    };
    const onSelectionChange = (e: Event) => {
      if (e.composed) {
        return;
      }

      ({ selectionStart, selectionEnd } = input);
      let text = selection.toString();
      if (selectionStart === selectionEnd || !input || !text) {
        unmount();
        return;
      }
      prevSelection = [selectionStart, selectionEnd];
      changeElPosition();
      const render = () => {
        const fullContent = input.value;
        ReactDOM.render(
          <Toolbar
            text={text}
            onAfter={async (text, selection = { start: 0, end: 0 }) => {
              const afterString =
                fullContent.substring(0, selectionStart) +
                text +
                fullContent.substring(selectionEnd);
              input.value = afterString;

              input.setSelectionRange(
                selectionStart + selection.start,
                selectionStart + text.length + selection.end
              );
              input.focus();
              prevValue = afterString;
              console.log(
                selection,
                text,
                selectionStart,
                " = input",
                selectionStart + selection.start,
                selectionStart + text.length + selection.end
              );

              // render();

              // setTimeout(async () => {
              //   await delay(10);
              //   await window.roamAlphaAPI.ui.setBlockFocusAndSelection({
              //     location: focusedBlock,
              //     selection: {
              //       start: selectionStart + selection.start,
              //       end: selectionStart + text.length + selection.end,
              //     },
              //   });
              // });
            }}
          />,
          el
        );
      };
      render();
    };
    document.addEventListener("selectionchange", onSelectionChange);

    stop = async () => {
      console.log(" stop");
      unmount();
      selectionStart = selectionEnd = 0;
      if (prevValue) await updateStr(block[":block/uid"], prevValue);
      prevValue = "";
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  };
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.zIndex = "9";
  document.body.appendChild(el);
  document.arrive(INPUT_SELECTOR, start);
  const stopFactory = () => {
    // el.style.display = 'none'
    stop();
  };
  document.leave(INPUT_SELECTOR, stopFactory);
  return () => {
    try {
      stopFactory();
      document.body.removeChild(el);
      document.unbindLeave(INPUT_SELECTOR, stopFactory);
      document.unbindArrive(INPUT_SELECTOR, start);
    } catch (e) {
      console.error(e);
    }
  };
}
