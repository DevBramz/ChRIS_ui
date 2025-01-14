import React, { useCallback, useContext, useEffect, useState } from "react";
import { notification, Steps } from "antd";
import {
  WizardContext,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  Drawer,
  CardTitle,
  Chip,
  DrawerActions,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Grid,
  GridItem,
  Tooltip,
  Button,
} from "@patternfly/react-core";
import { CreateFeedContext } from "./context";
import { FaTrash, FaUpload } from "react-icons/fa";
import { BiCloudUpload } from "react-icons/bi";
import { MdSettings } from "react-icons/md";
import LocalFileUpload from "./LocalFileUpload";
import DragAndUpload from "../../common/fileupload";
import ChrisFileSelect from "./ChrisFileSelect";
import DataPacks from "./DataPacks";
import GuidedConfig from "../AddNode/GuidedConfig";
import { chooseConfigProps } from "../AddNode/types";
import { FileList } from "./helperComponents";
import { Types } from "./types/feed";
import { AddNodeContext } from "../AddNode/context";
import { Types as AddNodeTypes } from "../AddNode/types";
import { useTypedSelector } from "../../../store/hooks";

const ChooseConfig = ({ handleFileUpload, user }: chooseConfigProps) => {
  const { state, dispatch } = useContext(CreateFeedContext);
  const { dispatch: nodeDispatch } = useContext(AddNodeContext);
  const { state: addNodeState } = useContext(AddNodeContext);
  const { selectedConfig } = state;
  const { pluginMeta, requiredInput } = addNodeState;
  const { isDataSelected, localFiles, chrisFiles } = state.data;
  const { onNext, onBack } = useContext(WizardContext);
  const [isRightDrawerExpand, setRightDrawerExpand] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(0);
  const params = useTypedSelector((state) => state.plugin.parameters);
  const [selectedCard, setSelectedCard] = useState("");
  const [showDragAndDrop, setShowDragAndDrop] = useState(false);

  const handleClick = useCallback(
    (event: React.MouseEvent, selectedPluginId = "") => {
      const selectedCard =
        selectedPluginId == "" ? event.currentTarget.id : selectedPluginId;
      setSelectedCard(selectedCard);
      if (selectedCard == "swift_storage" || selectedCard == "fs_plugin") {
        setRightDrawerExpand(true);
      } else if (selectedCard == "local_select") {
        setShowDragAndDrop(true);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: any) => {
      if (e.target.closest("INPUT.required-params__textInput")) return;
      switch (e.code) {
        case "KeyG":
          handleClick(e, "fs_plugin");
          break;
        case "KeyU":
          handleClick(e, "local_select");
          break;
        case "KeyF":
          handleClick(e, "swift_storage");
          break;
        case "ArrowRight":
          if (
            selectedConfig.includes("fs_plugin") &&
            params?.required.length != Object.keys(requiredInput).length
          )
            return;
          else {
            onNext();
          }
          break;
        case "ArrowLeft":
          onBack();
          break;
        default:
          break;
      }
    },
    [
      handleClick,
      onBack,
      onNext,
      params?.required.length,
      requiredInput,
      selectedConfig,
    ]
  );

  const onCloseClick = () => {
    setRightDrawerExpand(false);
  };
  const cardContainerStyle: any = {
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    textAlign: "center",
    height: "100%",
    border: "0.2px solid #D3D3D3",
  };

  const cardHeaderStyle: any = {
    display: "flex",
    width: "100%",
    justifyContent: "flex-end",
  };

  const nextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };
  const steps = [
    {
      title: "Choose Plugin",
      content: <DataPacks next={nextStep} />,
    },
    {
      title: "Configure Plugin",
      content: <GuidedConfig />,
    },
  ];

  const items = steps.map((item) => ({ key: item.title, title: item.title }));
  useEffect(() => {
    if (chrisFiles.length === 0 && selectedConfig.includes("swift_storage")) {
      dispatch({
        type: Types.SelectedConfig,
        payload: {
          selectedConfig: state.selectedConfig.filter(
            (value) => value !== "swift_storage"
          ),
        },
      });
    }
  }, [chrisFiles, dispatch, selectedConfig, state.selectedConfig]);

  useEffect(() => {
    if (pluginMeta === undefined && selectedConfig.includes("fs_plugin")) {
      dispatch({
        type: Types.SelectedConfig,
        payload: {
          selectedConfig: state.selectedConfig.filter(
            (value) => value !== "fs_plugin"
          ),
        },
      });
    }
  }, [dispatch, pluginMeta, selectedConfig, state.selectedConfig]);

  const resetPlugin = () => {
    notification.info({
      message: `Plugin unselected`,
      description: `${pluginMeta?.data.name} unselected`,
      duration: 1,
    });
    nodeDispatch({
      type: AddNodeTypes.SetPluginMeta,
      payload: {
        pluginMeta: undefined,
      },
    });
    nodeDispatch({
      type: AddNodeTypes.DropdownInput,
      payload: {
        input: {},
        editorValue: true,
      },
    });
    nodeDispatch({
      type: AddNodeTypes.RequiredInput,
      payload: {
        input: {},
        editorValue: true,
      },
    });
    setSelectedCard("");
  };

  const resetChRisFiles = () => {
    dispatch({
      type: Types.ResetChrisFile,
    });
    dispatch({
      type: Types.SelectedConfig,
      payload: {
        selectedConfig: state.selectedConfig.filter(
          (value) => value !== "swift_storage"
        ),
      },
    });
    setSelectedCard("");
  };

  const navigationButtonStyle = {
    display: "flex",
    width: "100%",
    justifyContent: "flex-end",
    gap: "2px",
    marginTop: "10px",
  };

  const drawerStyle = {
    display: "flex",
    gap: "5px",
    padding: "1rem",
  };

  const panelContent =
    selectedCard == "swift_storage" ? (
      <DrawerPanelContent defaultSize="65%" className="drawer_panelContent">
        <DrawerHead>
          <span tabIndex={isRightDrawerExpand ? 0 : -1}></span>
          <DrawerActions style={drawerStyle}>
            <Button
              onClick={resetChRisFiles}
              variant="secondary"
              isDisabled={chrisFiles.length === 0}
            >
              Clear
            </Button>
            <Button onClick={onCloseClick}>Done</Button>
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          {user && user.username && (
            <ChrisFileSelect username={user.username} />
          )}
          <Grid style={navigationButtonStyle}></Grid>
        </DrawerPanelBody>
      </DrawerPanelContent>
    ) : selectedCard == "fs_plugin" ? (
      <DrawerPanelContent defaultSize="65%" className="drawer_panelContent">
        <DrawerHead>
          <span tabIndex={isRightDrawerExpand ? 0 : -1}></span>
          <DrawerActions style={drawerStyle}>
            <Button
              onClick={resetPlugin}
              variant="secondary"
              isDisabled={pluginMeta === undefined}
            >
              Clear
            </Button>
            <Button
              className="done"
              onClick={onCloseClick}
              isDisabled={
                params?.required.length !== Object.keys(requiredInput).length
              }
            >
              Done
            </Button>
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          <Steps current={currentStep} items={items} />
          <Grid style={{ marginTop: "1rem" }}>
            {steps[currentStep].content}
          </Grid>
          <Grid style={navigationButtonStyle}>
            {currentStep == 0 && (
              <Button
                onClick={() => nextStep()}
                isDisabled={pluginMeta == undefined}
              >
                Next
              </Button>
            )}
            {currentStep > 0 && (
              <Button onClick={() => prevStep()}>Previous</Button>
            )}
          </Grid>
        </DrawerPanelBody>
      </DrawerPanelContent>
    ) : null;

  const fileList =
    chrisFiles.length > 0
      ? chrisFiles.map((file: string, index: number) => (
          <React.Fragment key={index}>
            <FileList file={file} index={index} />
          </React.Fragment>
        ))
      : null;

  useEffect(() => {
    const footer = document.querySelectorAll<HTMLElement>(
      ".pf-c-wizard__footer"
    )[0];
    if (isRightDrawerExpand && footer) {
      footer.style.display = "none";
    } else if (footer) {
      footer.style.display = "flex";
    }
  }, [isRightDrawerExpand]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (localFiles.length == 0) {
      setShowDragAndDrop(false);
    }
  }, [localFiles.length]);

  return (
    <Drawer isExpanded={isRightDrawerExpand} position="right">
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>
          <div className="local-file-upload">
            <h1 className="pf-c-title pf-m-2xl">Analysis Type Selection</h1>
            <br />
            <p>
              {isDataSelected
                ? "Creating analysis from selected files."
                : "You may create the analysis in one of the following ways:"}
            </p>
            <br />
            <Grid hasGutter md={4}>
              <GridItem>
                <Grid>
                  <GridItem style={{ height: "230px" }}>
                    <Card
                      id="fs_plugin"
                      isSelectableRaised
                      isDisabledRaised={isDataSelected}
                      hasSelectableInput
                      style={cardContainerStyle}
                      onClick={handleClick}
                      isSelected={selectedConfig.includes("fs_plugin")}
                    >
                      <CardHeader style={cardHeaderStyle}>
                        <CardActions>
                          <Tooltip content="Press the G key to select">
                            <Chip key="KeyboardShortcut" isReadOnly>
                              G
                            </Chip>
                          </Tooltip>
                        </CardActions>
                      </CardHeader>
                      <CardTitle>
                        <MdSettings size="40" />
                        <br />
                        Generate Data
                      </CardTitle>
                      <CardBody>
                        Generate files from running an FS plugin from this ChRIS
                        server
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem>
                    {pluginMeta && (
                      <>
                        <h1>Selected Plugin:</h1>
                        <div
                          style={{ display: "flex", alignItems: "baseline" }}
                        >
                          <p>{pluginMeta.data.title}</p>
                          <span className="trash-icon">
                            <FaTrash onClick={resetPlugin} />
                          </span>
                        </div>
                      </>
                    )}
                  </GridItem>
                </Grid>
              </GridItem>
              <GridItem>
                <Grid>
                  <GridItem style={{ height: "230px" }}>
                    <Card
                      id="swift_storage"
                      isSelectableRaised
                      hasSelectableInput
                      isDisabledRaised={isDataSelected}
                      style={cardContainerStyle}
                      onClick={handleClick}
                      isSelected={selectedConfig.includes("swift_storage")}
                    >
                      <CardHeader style={cardHeaderStyle}>
                        <Tooltip content="Press the F key to select">
                          <Chip key="KeyboardShortcut" isReadOnly>
                            F
                          </Chip>
                        </Tooltip>
                      </CardHeader>
                      <CardTitle>
                        <BiCloudUpload size="40" />
                        <br />
                        Fetch Data from ChRIS
                      </CardTitle>
                      <CardBody>
                        Choose existing files already registered to ChRIS
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem rowSpan={6}>
                    {chrisFiles.length > 0 && (
                      <>
                        <h1>Files to add to new analysis:</h1>
                        <div className="file-list">{fileList}</div>
                      </>
                    )}
                  </GridItem>
                </Grid>
              </GridItem>
              <GridItem>
                <Grid>
                  <GridItem style={{ height: "230px" }}>
                    {!showDragAndDrop ? (
                      <Card
                        id="local_select"
                        isSelectableRaised
                        hasSelectableInput
                        isDisabledRaised={isDataSelected}
                        style={cardContainerStyle}
                        onClick={handleClick}
                        isSelected={selectedConfig.includes("local_select")}
                      >
                        <CardHeader style={cardHeaderStyle}>
                          <Tooltip content="Press the U key to select">
                            <Chip key="KeyboardShortcut" isReadOnly>
                              U
                            </Chip>
                          </Tooltip>
                        </CardHeader>
                        <CardTitle>
                          <FaUpload size="40" />
                          <br />
                          Upload New Data
                        </CardTitle>
                        <CardBody>
                          Upload new files from your local computer
                        </CardBody>
                      </Card>
                    ) : (
                      <DragAndUpload
                        handleLocalUploadFiles={handleFileUpload}
                      />
                    )}
                  </GridItem>
                  <GridItem rowSpan={6}>
                    {localFiles.length > 0 ? <LocalFileUpload /> : null}
                  </GridItem>
                </Grid>
              </GridItem>
            </Grid>
          </div>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ChooseConfig;
