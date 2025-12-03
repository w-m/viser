// @refresh reset

import {
  ActionIcon,
  Box,
  Divider,
  Paper,
  ScrollArea,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import React from "react";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

const SidebarPanelContext = React.createContext<null | {
  collapsible: boolean;
  toggleCollapsed: () => void;
}>(null);

/** A fixed or collapsible side panel for displaying controls. */
export default function SidebarPanel({
  children,
  collapsible,
  width,
}: {
  children: string | React.ReactNode;
  collapsible: boolean;
  width: string;
}) {
  const [collapsed, { toggle: toggleCollapsed }] = useDisclosure(false);

  /* ------------------------------------------------------------------
   * Resizable sidebar support
   * ------------------------------------------------------------------ */
  // Convert provided width (em / px / etc.) to pixels for internal math.
  const defaultWidthPx = React.useMemo(() => {
    if (width.endsWith("em")) {
      const em = parseFloat(width);
      // Roughly estimate 1em = 16px; we don't have the actual font-size yet.
      return em * 16;
    } else if (width.endsWith("px")) {
      return parseFloat(width);
    } else {
      // Fallback – try to parse as number.
      return parseFloat(width);
    }
  }, [width]);

  const MIN_WIDTH_PX = 12 * 16; // 12em
  const MAX_WIDTH_PX = 40 * 16; // 40em

  const HANDLE_WIDTH = 8; // px

  const [panelWidth, setPanelWidth] = React.useState<number>(defaultWidthPx);

  // Refs to track dragging state.
  const isResizingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(0);

  const onMouseMove = React.useCallback((evt: MouseEvent) => {
    if (!isResizingRef.current) return;
    const dx = startXRef.current - evt.clientX; // dragging towards left enlarges width
    let newWidth = startWidthRef.current + dx;
    newWidth = Math.min(Math.max(newWidth, MIN_WIDTH_PX), MAX_WIDTH_PX);
    setPanelWidth(newWidth);
  }, []);

  const onMouseUp = React.useCallback(() => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
  }, [onMouseMove]);

  const startResizing = (evt: React.MouseEvent) => {
    evt.preventDefault();
    isResizingRef.current = true;
    startXRef.current = evt.clientX;
    startWidthRef.current = panelWidth;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  /* ------------------------------------------------------------------
   * Allow users to change the width of the sidebar by dragging.
   *
   * The simplest cross-browser way to provide manual resizing without
   * introducing new dependencies is to rely on the native CSS
   * `resize: horizontal` rule together with `overflow: auto`.  Browsers
   * render a small drag handle that lets the user adjust the width.  As
   * the user drags, the inline `width` style on the element is updated
   * automatically, so we simply need to make sure we do **not** override
   * the width on every React render.  Therefore, we only set the width
   * initially via a `style` prop and then let the browser take over.
   * ------------------------------------------------------------------ */

  const collapsedView = (
    <Box
      style={(theme) => ({
        /* Animate in when collapsed. */
        position: "absolute",
        top: 0,
        right: collapsed ? "0em" : "-3em",
        transitionProperty: "right",
        transitionDuration: "0.5s",
        transitionDelay: "0.25s",
        /* Visuals. */
        borderBottomLeftRadius: "0.5em",
        backgroundColor:
          useMantineColorScheme().colorScheme == "dark"
            ? theme.colors.dark[5]
            : theme.colors.gray[2],
        padding: "0.5em",
      })}
    >
      <ActionIcon
        onClick={(evt) => {
          evt.stopPropagation();
          toggleCollapsed();
        }}
      >
        <Tooltip zIndex={100} label={"Show sidebar"}>
          {<IconChevronLeft />}
        </Tooltip>
      </ActionIcon>
    </Box>
  );

  return (
    <SidebarPanelContext.Provider
      value={{
        collapsible: collapsible,
        toggleCollapsed: toggleCollapsed,
      }}
    >
      {collapsedView}
      {/* Using an <Aside /> below will break Mantine color inputs. */}
      {/* We create two <Paper /> elements. The first is only used for a drop
      shadow. Note the z-index difference, which is used to put the shadow
      behind the titlebar but the content in front of it. (and thus also in
      front of the titlebar's shadow) */}
      <Paper
        shadow="0 0 1em 0 rgba(0,0,0,0.1)"
        style={{
          width: collapsed ? 0 : panelWidth,
          boxSizing: "content-box",
          transition: "width 0.5s 0s",
          zIndex: 8,
        }}
      ></Paper>
      <Paper
        radius={0}
        style={{
          width: collapsed ? 0 : panelWidth,
          top: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          boxSizing: "content-box",
          transition: "width 0.5s 0s",
          zIndex: 20,
          overflow: "auto",
        }}
      >
        {/* Drag handle */}
        {/* Invisible but clickable drag handle injected *outside* the panel
            bounds so that it is not occluded by the canvas underneath. */}
        <Box
          onMouseDown={startResizing}
          /* 14-px wide hit area sitting *inside* the sidebar so it isn’t
             clipped by overflow rules. Safari sometimes ignores clicks on
             elements that spill outside parents. */
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: HANDLE_WIDTH,
            cursor: "ew-resize",
            zIndex: 25,
            WebkitUserSelect: "none",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        />
        <Box
          /* Prevent DOM reflow, as well as internals from getting too wide.
           * Needs to match the width of the wrapper element above. */
          style={{
            width: Math.max(panelWidth - HANDLE_WIDTH, 0),
            height: "100%",
            display: "flex",
            flexDirection: "column",
            marginLeft: HANDLE_WIDTH,
            boxSizing: "border-box",
          }}
        >
          {children}
        </Box>
      </Paper>
    </SidebarPanelContext.Provider>
  );
}

/** Handle object helps us hide, show, and drag our panel.*/
SidebarPanel.Handle = function SidebarPanelHandle({
  children,
}: {
  children: string | React.ReactNode;
}) {
  const { toggleCollapsed, collapsible } =
    React.useContext(SidebarPanelContext)!;

  const collapseSidebarToggleButton = (
    <ActionIcon
      onClick={(evt) => {
        evt.stopPropagation();
        toggleCollapsed();
      }}
    >
      <Tooltip zIndex={100} label={"Collapse sidebar"}>
        {<IconChevronRight stroke={1.625} />}
      </Tooltip>
    </ActionIcon>
  );
  return (
    <>
      <Box
        p="xs"
        style={{
          lineHeight: "1.5em",
          fontWeight: 400,
          position: "relative",
          zIndex: 20,
          alignItems: "center",
          display: "flex",
          flexDirection: "row",
        }}
      >
        {children}
        {collapsible ? collapseSidebarToggleButton : null}
      </Box>
      <Divider mx="xs" />
    </>
  );
};
/** Contents of a panel. */
SidebarPanel.Contents = function SidebarPanelContents({
  children,
}: {
  children: string | React.ReactNode;
}) {
  return <ScrollArea style={{ flexGrow: 1 }}>{children}</ScrollArea>;
};
