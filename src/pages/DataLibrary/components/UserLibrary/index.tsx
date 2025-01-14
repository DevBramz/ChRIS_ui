import React, { useContext } from "react";
import {
  Button,
  Modal,
  ModalVariant,
  Form,
  FormGroup,
  TextInput,
  AlertGroup,
  ChipGroup,
  CodeBlock,
  Chip,
  Tabs,
  Tab,
  TabTitleText,
  CodeBlockCode,
} from "@patternfly/react-core";
import { Feed } from "@fnndsc/chrisapi";
import { Alert, Progress as AntProgress } from "antd";
import BrowserContainer from "./BrowserContainer";
import LocalSearch from "./LocalSearch";
import { LocalFileList } from "../../../../components/feed/CreateFeed/helperComponents";
import DragAndUpload from "../../../../components/common/fileupload";
import { FaUpload } from "react-icons/fa";
import ChrisAPIClient from "../../../../api/chrisapiclient";
import { useTypedSelector } from "../../../../store/hooks";
import { FileSelect, LibraryContext, Types } from "./context";
import { MainRouterContext } from "../../../../routes";
import {
  clearSelectFolder,
  setDeleteFile,
  setMultiColumnLayout,
} from "./context/actions";
import { deleteFeed } from "../../../../store/feed/actions";
import { useDispatch } from "react-redux";
import { catchError, fetchResource } from "../../../../api/common";
import ReactJson from "react-json-view";
import "./user-library.scss";
import axios, { AxiosResponse } from "axios";
import useCookieToken from "../../../../components/common/fetch";

interface DownloadType {
  name: string;
  files: any[];
}

const DataLibrary = () => {
  const dispatch = useDispatch();
  const { state, dispatch: dispatchLibrary } = useContext(LibraryContext);
  const [activeTabKey, setActiveTabKey] = React.useState<number>(0);
  const username = useTypedSelector((state) => state.user.username);
  const router = useContext(MainRouterContext);
  const [uploadFileModal, setUploadFileModal] = React.useState(false);
  const [localFiles, setLocalFiles] = React.useState<File[]>([]);
  const { foldersState, selectedFolder, currentPath } = state;
  const [error, setError] = React.useState<any[]>([]);
  const [fetchingFiles, setFetchingFiles] = React.useState(false);
  const [feedFilesToDelete, setFeedFilestoDelete] = React.useState<
    FileSelect[]
  >([]);

  const [download, setDownload] = React.useState({
    show: false,
    error: "",
    count: 0,
    path: "",
  });

  const handleFileModal = () => {
    setUploadFileModal(!uploadFileModal);
    setLocalFiles([]);
  };

  const handleLocalFiles = (files: File[]) => {
    setLocalFiles(files);
  };

  const returnFeedPath = (path: string) => {
    const pathSplit = path.split("/");

    const newPath = pathSplit.filter((path) => path !== "").join("/");
    return newPath;
  };

  const createFeed = () => {
    const pathList = selectedFolder.map((file) => {
      if (file.type === "feed") {
        return returnFeedPath(file.folder.path);
      }
      return file.folder.path;
    });
    router.actions.createFeedWithData(pathList);
  };

  const clearFeed = () => {
    dispatchLibrary({
      type: Types.SET_CLEAR_FILE_SELECT,
      payload: {
        clear: true,
      },
    });
    setDownload({
      show: false,
      error: "",
      count: 0,
      path: "",
    });
  };

  const handleTabClick = (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    eventKey: number | string
  ) => {
    setActiveTabKey(eventKey as number);
  };

  const handleDownload = async () => {
    setFetchingFiles(!fetchingFiles);

    Promise.all(
      selectedFolder.map(async (file: FileSelect) => {
        const { folder } = file;

        const { path: exactPath } = folder;
        const filesToPush: DownloadType = {
          name: file.folder.name,
          files: [],
        };

        const computePath =
          file.type === "feed" ? returnFeedPath(exactPath) : exactPath;

        const params = {
          limit: 1000,
          offset: 0,
          fname: computePath,
        };

        const client = ChrisAPIClient.getClient();
        if (file.type === "feed") {
          const feedFn = client.getFiles;
          const bindFn = feedFn.bind(client);
          const { resource: fileItems } = await fetchResource(params, bindFn);
          filesToPush["files"].push(...fileItems);
        }

        if (file.type === "uploads") {
          const uploadsFn = client.getUploadedFiles;
          const uploadBound = uploadsFn.bind(client);
          const { resource: fileItems } = await fetchResource(
            params,
            uploadBound
          );
          filesToPush["files"].push(...fileItems);
        }
        if (file.type === "services") {
          const pacsFn = client.getPACSFiles;
          const pacsBound = pacsFn.bind(client);
          const { resource: fileItems } = await fetchResource(
            params,
            pacsBound
          );
          filesToPush["files"].push(...fileItems);
        }
        return filesToPush;
      })
    ).then((files) => {
      setFetchingFiles(false);
      if (files.length > 0) {
        downloadUtil(files);
      }
    });
  };

  const downloadUtil = async (filesItems: DownloadType[]) => {
    try {
      let writable;
      //@ts-ignore
      const existingDirectoryHandle = await window.showDirectoryPicker();
      for (let i = 0; i < filesItems.length; i++) {
        const { files, name } = filesItems[i];

        if (files.length > 0) {
          for (let index = 0; index < files.length; index++) {
            setDownload({
              ...download,
              show: true,
              count: Number(((index / files.length) * 100).toFixed(2)),
              path: `Downloading Files for the path ${name}`,
            });
            const file = files[index];
            const fileName = file.data.fname.split(`/`);
            const findIndex = fileName.findIndex(
              (file: string) => file === name
            );
            const fileNameSplit = fileName.slice(findIndex);
            const newDirectoryHandle: { [key: string]: any } = {};
            for (let fname = 0; fname < fileNameSplit.length; fname++) {
              const dictName = fileNameSplit[fname].replace(/:/g, "");
              if (fname === 0) {
                newDirectoryHandle[fname] =
                  await existingDirectoryHandle.getDirectoryHandle(dictName, {
                    create: true,
                  });
              } else if (fname === fileNameSplit.length - 1) {
                const blob = await file.getFileBlob();
                const existingHandle = newDirectoryHandle[fname - 1];
                if (existingHandle) {
                  const newFileHandle = await existingHandle.getFileHandle(
                    dictName,
                    {
                      create: true,
                    }
                  );
                  writable = await newFileHandle.createWritable();
                  await writable.write(blob);
                  await writable.close();
                }
              } else {
                const existingHandle = newDirectoryHandle[fname - 1];
                if (existingHandle) {
                  newDirectoryHandle[fname] =
                    await existingHandle.getDirectoryHandle(dictName, {
                      create: true,
                    });
                }
              }
            }

            setDownload({
              ...download,
              show: false,
              count: 100,
            });
          }
        } else {
        }
      }
    } catch (error) {
      setDownload({
        ...download,
        //@ts-ignore
        error: error,
      });
      setFetchingFiles(false);
    }
  };

  const handleDelete = () => {
    const errorWarnings: any[] = [];

    selectedFolder.map(async (file: FileSelect) => {
      const client = ChrisAPIClient.getClient();
      if (file.type === "uploads") {
        if (file.operation === "folder") {
          const paths = await client.getFileBrowserPath(file.folder.path);
          const fileList = await paths.getFiles({
            limit: 1000,
            offset: 0,
          });
          const files = fileList.getItems();
          if (files) {
            files.map(async (file: any) => {
              await file._delete();
            });
            dispatchLibrary(setDeleteFile(file));
            dispatchLibrary(clearSelectFolder(file));
          }
        } else {
          errorWarnings.push("file");
        }
      }

      if (file.type === "feed") {
        if (!errorWarnings.includes("feed")) {
          errorWarnings.push("feed");
        }
        setFeedFilestoDelete([...feedFilesToDelete, file]);
      }

      if (file.type === "services") {
        if (!errorWarnings.includes("services")) {
          errorWarnings.push("services");
        }
      }
    });

    setError(errorWarnings);
  };

  const handleDeleteFeed = async () => {
    const result = Promise.all(
      feedFilesToDelete.map(async (file) => {
        const feedId = file.folder.path
          .split("/")
          .find((feedString) => feedString.includes("feed"));

        if (feedId) {
          const id = feedId.split("_")[1];
          const client = ChrisAPIClient.getClient();
          const feed = await client.getFeed(parseInt(id));
          dispatchLibrary(setDeleteFile(file));
          dispatchLibrary(clearSelectFolder(file));
          return feed;
        }
      })
    );
    result.then((data) => dispatch(deleteFeed(data as Feed[])));
  };

  const uploadedFiles = (
    <section>
      <LocalSearch type="uploads" username={username} />
      <BrowserContainer
        type="uploads"
        path={`${username}/uploads`}
        username={username}
      />
    </section>
  );

  const feedFiles = (
    <section>
      <LocalSearch type="feed" username={username} />
      <BrowserContainer type="feed" path={`/`} username={username} />
    </section>
  );

  const servicesFiles = (
    <section>
      <LocalSearch type="services" username={username} />
      <BrowserContainer type="services" path={`SERVICES`} username={username} />
    </section>
  );

  const handleAddFolder = (directoryName: string) => {
    const folders =
      foldersState["uploads"] &&
      foldersState["uploads"][currentPath["uploads"]];

    const folderExists =
      folders && folders.findIndex((folder) => folder.name === directoryName);

    if (!folders || folderExists === -1) {
      dispatchLibrary({
        type: Types.SET_ADD_FOLDER,
        payload: {
          folder: directoryName,
          username,
        },
      });
    }
  };

  return (
    <>
      {selectedFolder.length > 0 && (
        <AlertGroup
          style={{
            zIndex: "999",
          }}
          isToast
        >
          <Alert
            type="info"
            description={
              <>
                <div
                  style={{
                    marginBottom: "1em",
                    display: "flex",
                  }}
                >
                  <Button
                    style={{ marginRight: "0.5em" }}
                    onClick={createFeed}
                    variant="primary"
                  >
                    Create Analysis
                  </Button>

                  <Button
                    style={{ marginRight: "0.5em" }}
                    onClick={() => {
                      handleDownload();
                    }}
                    variant="secondary"
                  >
                    Download Data
                  </Button>
                  <Button variant="danger" onClick={handleDelete}>
                    Delete Data
                  </Button>
                </div>
                {selectedFolder.length > 0 && (
                  <>
                    <ChipGroup style={{ marginBottom: "1em" }} categoryName="">
                      {selectedFolder.map((file: FileSelect, index) => {
                        return (
                          <Chip
                            onClick={() => {
                              dispatchLibrary(clearSelectFolder(file));
                            }}
                            key={index}
                          >
                            {file.folder.path}
                          </Chip>
                        );
                      })}
                    </ChipGroup>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Button variant="tertiary" onClick={clearFeed}>
                        Empty Cart
                      </Button>
                    </div>
                  </>
                )}
              </>
            }
            style={{ width: "100%", marginTop: "3em", padding: "2em" }}
          ></Alert>

          {fetchingFiles && (
            <Alert type="info" closable message="Fetching Files to Download" />
          )}

          {download.show && (
            <Alert
              type="info"
              closable
              message={
                <>
                  <span>{download.path}</span>
                  <AntProgress percent={download.count} size="small" />
                </>
              }
            />
          )}

          {error.length > 0 &&
            error.map((errorString, index) => {
              const errorUtil = (errorType: string) => {
                const newError = error.filter(
                  (errorWarn) => errorWarn !== errorType
                );
                setError(newError);
              };

              let warning = "";
              if (errorString === "feed") {
                warning = "Deleting a feed file deletes a feed";
              }
              if (errorString === "services") {
                warning = "Cannot Delete a pacs file currently";
              }

              if (errorString === "file") {
                warning = "Cannot delete a single file currently";
              }

              return (
                <Alert
                  key={index}
                  message={
                    <>
                      <div>{warning && warning}</div>
                      {errorString === "feed" && (
                        <>
                          {" "}
                          <Button
                            variant="link"
                            onClick={() => {
                              errorUtil(errorString);
                              handleDeleteFeed();
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            onClick={() => {
                              errorUtil(errorString);
                            }}
                            variant="link"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </>
                  }
                  type="warning"
                  closable
                  onClose={() => {
                    errorUtil(errorString);
                  }}
                ></Alert>
              );
            })}
        </AlertGroup>
      )}

      <UploadComponent
        handleFileModal={handleFileModal}
        handleLocalFiles={handleLocalFiles}
        uploadFileModal={uploadFileModal}
        handleAddFolder={handleAddFolder}
        localFiles={localFiles}
        handleDelete={(name: string) => {
          const filteredfiles = localFiles.filter((file) => file.name !== name);
          setLocalFiles(filteredfiles);
        }}
      />

      <div
        style={{
          display: "flex",
        }}
      >
        <Button
          style={{
            marginLeft: "auto",
          }}
          variant="primary"
          icon={<FaUpload />}
          onClick={handleFileModal}
        >
          Upload Files
        </Button>
        <Button
          style={{
            marginLeft: "0.5em",
          }}
          variant="primary"
          onClick={() => {
            if (state.columnLayout === "multi") {
              dispatchLibrary(setMultiColumnLayout("single"));
            } else {
              dispatchLibrary(setMultiColumnLayout("multi"));
            }
          }}
        >
          Switch Column Layout
        </Button>
      </div>
      <Tabs
        style={{
          width: "50%",
        }}
        activeKey={activeTabKey}
        onSelect={handleTabClick}
        aria-label="Tabs in the default example"
      >
        <Tab eventKey={0} title={<TabTitleText>Uploads</TabTitleText>}>
          {activeTabKey === 0 && uploadedFiles}
        </Tab>
        <Tab
          eventKey={1}
          title={<TabTitleText>Completed Analyses</TabTitleText>}
        >
          {activeTabKey === 1 && feedFiles}
        </Tab>
        <Tab eventKey={2} title={<TabTitleText>Services / PACS</TabTitleText>}>
          {activeTabKey === 2 && servicesFiles}
        </Tab>
      </Tabs>
    </>
  );
};

export default DataLibrary;

interface UploadComponent {
  handleFileModal: () => void;
  handleLocalFiles: (files: File[]) => void;
  handleDelete: (name: string) => void;
  uploadFileModal: boolean;
  localFiles: File[];
  handleAddFolder: (path: string) => void;
}

interface FileUpload {
  file: File;

  promise: Promise<AxiosResponse<any>>;
}

const UploadComponent = ({
  handleFileModal,
  handleLocalFiles,
  handleAddFolder,
  handleDelete,
  uploadFileModal,
  localFiles,
}: UploadComponent) => {
  const token = useCookieToken();
  const username = useTypedSelector((state) => state.user.username);
  const [warning, setWarning] = React.useState<string | object>("");
  const [directoryName, setDirectoryName] = React.useState("");

  const [currentFile, setCurrentFile] = React.useState({});

  const handleLocalUploadFiles = (files: any[]) => {
    setWarning("");
    handleLocalFiles(files);
  };

  function getTimestamp() {
    const pad = (n: any, s = 2) => `${new Array(s).fill(0)}${n}`.slice(-s);
    const d = new Date();
    return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}-${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  const uploadFile = async (
    file: File,
    url: string,
    onUploadProgress: (progressEvent: ProgressEvent) => void
  ) => {
    const formData = new FormData();
    formData.append(
      "upload_path",
      `${username}/uploads/${directoryName}/${file.name}`
    );
    formData.append("fname", file, file.name);

    const config = {
      headers: { Authorization: "Token " + token },
      onUploadProgress,
    };

    const response = await axios.post(url, formData, config);
    return response;
  };

  React.useEffect(() => {
    const d = getTimestamp();
    setDirectoryName(`${d}`);
  }, [uploadFileModal]);

  const handleUpload = async () => {
    const client = ChrisAPIClient.getClient();
    await client.setUrls();
    const url = client.uploadedFilesUrl;

    const fileUploads: FileUpload[] = localFiles.map((file) => {
      const onUploadProgress = (progressEvent: ProgressEvent) => {
        const percentCompleted = `${Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )}%`;
        setCurrentFile((prevProgresses) => ({
          ...prevProgresses,
          [file.name]: percentCompleted,
        }));
      };
      const promise = uploadFile(file, url, onUploadProgress);

      return {
        file,
        promise,
      };
    });

    const completedUploads: number[] = [];

    for (let i = 0; i < fileUploads.length; i++) {
      const { promise } = fileUploads[i];
      try {
        await promise;
        completedUploads.push(i);
      } catch (error: any) {
        const err = catchError(error);
        setWarning(err);
      }
    }

    if (completedUploads.length === localFiles.length) {
      handleAddFolder(directoryName);
      setTimeout(() => {
        setCurrentFile({});
        handleFileModal();
      }, 3000);
    }
  };

  return (
    <Modal
      title="Upload Files"
      onClose={() => {
        handleFileModal();
      }}
      isOpen={uploadFileModal}
      variant={ModalVariant.large}
      arial-labelledby="file-upload"
      style={{ color: "white" }}
    >
      <div style={{ height: "200px" }}>
        <DragAndUpload handleLocalUploadFiles={handleLocalUploadFiles} />
      </div>

      {localFiles.length > 0 && (
        <div style={{ height: "200px", marginTop: "1rem", overflow: "scroll" }}>
          {localFiles.map((file, index) => {
            return (
              <LocalFileList
                key={index}
                handleDeleteDispatch={(name) => {
                  handleDelete(name);
                }}
                file={file}
                index={index}
                showIcon={true}
              />
            );
          })}
        </div>
      )}

      <Form style={{ marginTop: "1rem" }} isHorizontal>
        <FormGroup fieldId="directory name" label="Directory Name">
          <TextInput
            id="horizontal form name"
            value={directoryName}
            type="text"
            name="horizontal-form-name"
            onChange={(value) => {
              setWarning("");
              setDirectoryName(value);
            }}
          />
        </FormGroup>
      </Form>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Button
          isDisabled={localFiles.length === 0}
          onClick={handleUpload}
          icon={<FaUpload />}
          variant="secondary"
        >
          Push to File Storage
        </Button>
      </div>
      <CodeBlock
        style={{ marginTop: "1rem", height: "300px", overflow: "scroll" }}
      >
        <CodeBlockCode>
          {Object.keys(currentFile).length === 0 ? (
            <span style={{ color: "white", fontFamily: "monospace" }}>
              You have no active uploads. Please upload Files from your local
              computer and hit the &apos;Push to File Storage&apos; button. You
              can give a directory name for your upload or use the default name
              above. Your uploads will appear unders the &apos;Uploads&apos;
              space once it is complete.
            </span>
          ) : (
            <ReactJson
              style={{ height: "100%" }}
              displayDataTypes={false}
              theme="grayscale"
              src={currentFile}
              name={null}
              enableClipboard={false} // Set enableClipboard prop to false
              displayObjectSize={false} // Set displayObjectSize prop to false
              collapsed={4}
            />
          )}
        </CodeBlockCode>
        {warning && <CodeBlockCode>{JSON.stringify(warning)}</CodeBlockCode>}
      </CodeBlock>
    </Modal>
  );
};
