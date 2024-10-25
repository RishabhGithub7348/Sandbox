import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink } from "lucide-react";
import axios from "axios";
import { useDelay } from "@/hooks/useDelay";

type AccessIdentifierResponse = {
  accessIdentifierName?: string;
  error?: string;
};

type SessionTokenResponse = {
  token?: string;
  error?: string;
};


const SimulationViewer = () => {
  const [simulationUrl, setSimulationUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [accessIdentifierName, setAccessIdentifierName] = useState("");
  const [email, setEmail] = useState("");
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [lastMessageReceived, setLastMessageReceived] = useState(null);
  const createDelay = useDelay();

  // Refs for storing current values that we need in event listeners
  const currentAccessIdentifierNameRef = useRef("");
  const childWindowRef = useRef<Window | null>(null);
  const delayRef = useRef<typeof createDelay>(createDelay);

  useEffect(() => {
		delayRef.current = createDelay;
	}, [createDelay]);
  
  const createAccessIdentifier = async (): Promise<string | null> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post<AccessIdentifierResponse>("/api/create-access-identifier", {
        name: accessIdentifierName,
        email,
        accessKey,
        secretKey,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (!response.data.accessIdentifierName) {
        throw new Error("No accessIdentifierName received");
      }

      return response.data.accessIdentifierName;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        setError(errorMessage);
      } else {
        setError("Failed to create access identifier");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessIdentifierSessionToken = useCallback(
    async (accessIdentifierName: string): Promise<string | null> => {
      try {
        const response = await axios.post<SessionTokenResponse>("/api/get-session-token", {
          accessIdentifierName,
          accessKey,
          secretKey,
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        if (!response.data.token) {
          throw new Error("No token received");
        }
        return response.data.token;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error || error.message;
          setError(errorMessage);
        } else {
          setError("Failed to get session token");
        }
        return null;
      }
    },
    [accessKey, secretKey]
  );

  useEffect(() => {

    // Message handler for child window communications
    const handleMessage = async (event: MessageEvent) => {
      const eventData = event.data;

      // Log all incoming messages
      console.log("Message received from child window:", {
        fullEvent: eventData,
        origin: event.origin,
        source: event.source === childWindowRef.current ? "Known child window" : "Unknown source",
        timestamp: new Date().toISOString(),
      });

      setLastMessageReceived(eventData);

      if (eventData?.data?.type === "invalid-session-token") {
        console.log("Received invalid session token message:", {
          accessIdentifierName: currentAccessIdentifierNameRef.current,
          hasChildWindow: !!childWindowRef.current,
          eventDetails: eventData,
        });

        // Token is invalid, get a new one
        if (currentAccessIdentifierNameRef.current && childWindowRef.current) {
          console.log("Attempting to get new session token...");
          const newToken = await getAccessIdentifierSessionToken(currentAccessIdentifierNameRef.current);

          if (newToken) {
            console.log("Successfully obtained new token, sending to simulation");
            // Send new token to child window
            const message = {
              data: {
                type: "update-session-token",
                data: newToken,
              },
              metaData: {},
            };

            console.log("Sending message to child:", message);
            childWindowRef.current.postMessage(message, "*");
          } else {
            console.error("Failed to obtain new session token");
          }
        } else {
          console.warn("Cannot refresh token:", {
            hasAccessIdentifier: !!currentAccessIdentifierNameRef.current,
            hasChildWindow: !!childWindowRef.current,
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [getAccessIdentifierSessionToken]);

  const handleLoadSimulation = async () => {
    setError("");
    setIsLoading(true);
    console.log("Starting simulation load process...");

    try {
      const newAccessIdentifierName = await createAccessIdentifier();
      if (!newAccessIdentifierName) throw new Error("Failed to create access identifier");
      console.log("Created access identifier:", newAccessIdentifierName);

      const accessIdentifierToken = await getAccessIdentifierSessionToken(newAccessIdentifierName);
      if (!accessIdentifierToken) throw new Error("Failed to get session token");
      console.log("Createtidentifier token:", accessIdentifierToken);
      console.log("Obtained initial session token");

      // Store the access identifier name for future token refreshes
      currentAccessIdentifierNameRef.current = newAccessIdentifierName;

      const constructedUrl = `https://app.uat-1.monkeyscience.io/pg/simulations/scattering-of-white-light-ed813879cb0c662ec352d55d?access_identifier=${newAccessIdentifierName}&token=${accessIdentifierToken}`;
      setSimulationUrl(constructedUrl);
      console.log("Opening simulation URL:", constructedUrl);

      // Open the simulation in a new window
      const simulationWindow = window.open(constructedUrl, "SimulationWindow", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");

      if (simulationWindow) {
        childWindowRef.current = simulationWindow;
        setIsSimulationOpen(true);
        simulationWindow.focus();
        console.log("Simulation window opened successfully");
      } else {
        console.error("Failed to open simulation window - popup blocked");
        setError("Please allow pop-ups to view the simulation");
      }
    } catch (error) {
      console.error("Simulation load failed:", error);
      setError("Failed to load simulation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reopenSimulation = () => {
    if(!simulationUrl) return;

      console.log("Reopening simulation with URL:", simulationUrl);
      const simulationWindow = window.open(simulationUrl, "SimulationWindow", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
      if (simulationWindow) {
        childWindowRef.current = simulationWindow;
        simulationWindow.focus();
        console.log("Simulation window reopened successfully");
      } else {
        console.error("Failed to reopen simulation window - popup blocked");
        setError("Please allow pop-ups to view the simulation");
      }
    
  };

  return (
    <div className="flex flex-col w-[800px] items-center gap-10">
      <div className="flex bg-white border rounded-xl  shadow-lg w-full  p-8 space-y-4">
        <div className="flex flex-col w-full  gap-6">
          <div className="space-y-2">
            <Label htmlFor="access-key">Access Key</Label>
            <Input id="access-key" type="text" placeholder="Enter your access key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <Input id="secret-key" type="text" placeholder="Enter your secret key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Access Identifier Name</Label>
            <Input id="name" type="text" placeholder="Enter your access identifier name" value={accessIdentifierName} onChange={(e) => setAccessIdentifierName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {lastMessageReceived && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Last Message Received from Child Window:</p>
              <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded">{JSON.stringify(lastMessageReceived, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center w-full h-full ">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Simulation Viewer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {!isSimulationOpen ? (
                <Button onClick={handleLoadSimulation} disabled={isLoading || !accessKey || !secretKey || !accessIdentifierName || !email} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Simulation
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={reopenSimulation} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Reopen Simulation
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {simulationUrl && !error && (
              <Alert>
                <AlertDescription>{`Simulation opened in a new window. If you can't see it, please check your browser's pop-up settings.`}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimulationViewer;
