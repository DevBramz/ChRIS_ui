import React from "react";
import { useDispatch } from "react-redux";
import {
  Breadcrumb,
  BreadcrumbItem,
  Grid,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  DrawerPanelBody,
} from "@patternfly/react-core";
import { Table, TableHeader, TableBody } from "@patternfly/react-table";
import { FaFileCode } from "react-icons/fa";
import { MdFileDownload } from "react-icons/md";
import {
  AiFillFileImage,
  AiFillFileText,
  AiFillFile,
  AiFillFolder,
} from "react-icons/ai";
import FileDetailView from "../Preview/FileDetailView";
import FileViewerModel from "../../../api/models/file-viewer.model";
import { bytesToSize } from "./utils";
import { FeedFile } from "@fnndsc/chrisapi";
import { FileBrowserProps } from "./types";
import {
  clearSelectedFile,
  setSelectedFile,
} from "../../../store/explorer/actions";
import { SpinContainer } from "../../common/loading/LoadingContent";
import { EmptyStateLoader } from "./FeedOutputBrowser";
import { useTypedSelector } from "../../../store/hooks";
import { ClipboardCopyContainer } from "../../common/textcopypopover/TextCopyPopover";
import {
  DrawerActionButton,
  handleClose,
  handleMaximize,
  handleMinimize,
} from "../../common/button";
import { setFilePreviewPanel } from "../../../store/drawer/actions";
import XtkViewer from "../../detailedView/displays/XtkViewer/XtkViewer";

const getFileName = (name: any) => {
  return name.split("/").slice(-1);
};

const FileBrowser = (props: FileBrowserProps) => {
  const { pluginFilesPayload, handleFileClick, selected, filesLoading } = props;

  const selectedFile = useTypedSelector((state) => state.explorer.selectedFile);
  const drawerState = useTypedSelector((state) => state.drawers);
  const dispatch = useDispatch();

  const { files, folders, path } = pluginFilesPayload;
  const cols = [{ title: "Name" }, { title: "Size" }, { title: "" }];
  const items = files && folders ? [...files, ...folders] : [];
  const { id, plugin_name } = selected.data;
  const pathSplit = path && path.split(`/${plugin_name}_${id}/`);
  const breadcrumb = path ? pathSplit[1].split("/") : [];
  const handleDownloadClick = async (e: React.MouseEvent, item: FeedFile) => {
    e.stopPropagation();
    if (item) {
      const blob = await item.getFileBlob();
      FileViewerModel.downloadFile(blob, item.data.fname);
    }
  };

  const generateTableRow = (item: string | FeedFile) => {
    let type, icon, fsize, fileName;
    type = "UNKNOWN FORMAT";
    const isPreviewing = selectedFile === item;

    if (typeof item === "string") {
      type = "dir";
      icon = getIcon(type);
      fileName = item;
    } else {
      fileName = getFileName(item.data.fname);
      if (fileName.indexOf(".") > -1) {
        type = getFileName(fileName)[0].toUpperCase();
      }
      fsize = bytesToSize(item.data.fsize);
      icon = getIcon(type);
    }

    const fileNameComponent = (
      <div
        className={`file-browser__table--fileName 
          ${isPreviewing && "file-browser__table--isPreviewing"}`}
      >
        <span>{icon}</span>
        <span>{fileName}</span>
      </div>
    );

    const name = {
      title: fileNameComponent,
    };

    const size = {
      title: fsize,
    };

    const downloadComponent =
      typeof item === "string" ? undefined : (
        <MdFileDownload
          className="download-file-icon"
          onClick={(e: any) => handleDownloadClick(e, item)}
        />
      );

    const download = {
      title: downloadComponent,
    };

    return {
      cells: [name, size, download],
    };
  };
  const rows = items.length > 0 ? items.map(generateTableRow) : [];
  const previewAnimation = [{ opacity: "0.0" }, { opacity: "1.0" }];

  const previewAnimationTiming = {
    duration: 1000,
    iterations: 1,
  };

  const generateBreadcrumb = (value: string, index: number) => {
    const onClick = () => {
      dispatch(clearSelectedFile());
      if (index === breadcrumb.length - 1) {
        return;
      } else {
        const findIndex = breadcrumb.findIndex((path) => path === value);
        if (findIndex !== -1) {
          const newPathList = breadcrumb.slice(0, findIndex + 1);
          const combinedPathList = [
            ...pathSplit[0].split("/"),
            `${plugin_name}_${id}`,
            ...newPathList,
          ];
          handleFileClick(combinedPathList.join("/"));
        }
      }
    };

    return (
      <BreadcrumbItem
        className="file-browser__header--crumb"
        showDivider={true}
        key={index}
        onClick={onClick}
        to={index === breadcrumb.length - 1 ? undefined : "#"}
      >
        {value}
      </BreadcrumbItem>
    );
  };

  const toggleAnimation = () => {
    document
      .querySelector(".preview-panel")
      ?.animate(previewAnimation, previewAnimationTiming);
    document
      .querySelector(".small-preview")
      ?.animate(previewAnimation, previewAnimationTiming);
  };

  const previewPanel = (
    <DrawerPanelContent
      className="file-browser__previewPanel"
      isResizable
      defaultSize={
        !drawerState.directory.open && !drawerState.files.open
          ? "100%"
          : "55.3%"
      }
      minSize={"25%"}
    >
      <DrawerActionButton
        background="inherit"
        content="Preview"
        handleClose={() => {
          handleClose("preview", dispatch);
        }}
        handleMaximize={() => {
          handleMaximize("preview", dispatch);
        }}
        handleMinimize={() => {
          handleMinimize("preview", dispatch);
        }}
        maximized={drawerState["preview"].maximized}
      />
      <DrawerPanelBody className="file-browser__drawerbody">
        {drawerState["preview"].currentlyActive === "preview" &&
          selectedFile && (
            <FileDetailView selectedFile={selectedFile} preview="large" />
          )}
        {drawerState["preview"].currentlyActive === "xtk" && <XtkViewer />}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Grid hasGutter className="file-browser">
      <Drawer position="right" isInline isExpanded={true}>
        <DrawerContent
          panelContent={drawerState.preview.open ? previewPanel : null}
          className="file-browser__firstGrid"
        >
          <DrawerActionButton
            background="inherit"
            content="Files"
            handleClose={() => {
              handleClose("files", dispatch);
            }}
            handleMaximize={() => {
              handleMaximize("files", dispatch);
            }}
            handleMinimize={() => {
              handleMinimize("files", dispatch);
            }}
            maximized={drawerState["files"].maximized}
          />
          {drawerState.files.open && (
            <DrawerContentBody>
              <div className="file-browser__header">
                <div className="file-browser__header--breadcrumbContainer">
                  <ClipboardCopyContainer path={path} />
                  <Breadcrumb>{breadcrumb.map(generateBreadcrumb)}</Breadcrumb>
                </div>

                <div className="file-browser__header__info">
                  <span className="files-browser__header--fileCount">
                    {items.length > 1
                      ? `(${items.length} items)`
                      : items.length === 1
                      ? `(${items.length} item)`
                      : "Empty Directory"}
                  </span>
                </div>
              </div>
              <Table
                aria-label="file-browser-table"
                variant="compact"
                cells={cols}
                rows={rows}
              >
                <TableHeader className="file-browser-table--head" />
                {filesLoading ? (
                  <SpinContainer title="Fetching Files" />
                ) : !filesLoading && items.length === 0 ? (
                  <EmptyStateLoader title="Empty Data set" />
                ) : (
                  <TableBody
                    onRowClick={(event: any, rows: any, rowData: any) => {
                      dispatch(clearSelectedFile());
                      const rowIndex = rowData.rowIndex;
                      const item = items[rowIndex];
                      if (typeof item === "string") {
                        handleFileClick(`${path}/${item}`);
                      } else {
                        toggleAnimation();
                        dispatch(setSelectedFile(item));
                        !drawerState["preview"].open &&
                          dispatch(setFilePreviewPanel());
                      }
                    }}
                  />
                )}
              </Table>
            </DrawerContentBody>
          )}
        </DrawerContent>
      </Drawer>
    </Grid>
  );
};

export default FileBrowser;

const getIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "dir":
      return <AiFillFolder />;
    case "dcm":
    case "jpg":
    case "png":
      return <AiFillFileImage />;
    case "html":
    case "json":
      return <FaFileCode />;
    case "txt":
      return <AiFillFileText />;
    default:
      return <AiFillFile />;
  }
};
