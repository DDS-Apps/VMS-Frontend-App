entrypoint = "README.md"
modules = ["nodejs-20", "web"]

[nix]
channel = "stable-25_05"
packages = ["socat"]

[[ports]]
localPort = 8081
externalPort = 80

[[ports]]
localPort = 8082
externalPort = 3000

[[ports]]
localPort = 32815
externalPort = 8008

[[ports]]
localPort = 32907
externalPort = 6000

[[ports]]
localPort = 5000
externalPort = 5000

[[ports]]
localPort = 34139
externalPort = 8000

[[ports]]
localPort = 34353
externalPort = 9000

[[ports]]
localPort = 34877
externalPort = 6800

[[ports]]
localPort = 36551
externalPort = 5173

[[ports]]
localPort = 37279
externalPort = 3003

[[ports]]
localPort = 38939
externalPort = 8080

[[ports]]
localPort = 39049
externalPort = 8099

[[ports]]
localPort = 39533
externalPort = 3001

[[ports]]
localPort = 39667
externalPort = 4200

[[ports]]
localPort = 46029
externalPort = 3002

[[ports]]
localPort = 46241
externalPort = 8081

[[ports]]
localPort = 5000
externalPort = 80

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "EAS Init"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npx eas init"

[[workflows.workflow]]
name = "EAS Update"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npx eas update --auto"

[[workflows.workflow]]
name = "EAS Publish Preview iOS"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npx eas build --platform ios --profile preview"

[[workflows.workflow]]
name = "EAS Publish Preview Android"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npx eas build --platform android --profile preview"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[workflows.workflow.metadata]
outputType = "webview"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = """
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN npx expo start --web --port 5000 --host 0.0.0.0 &
sleep 10 && socat TCP-LISTEN:8081,fork,reuseaddr TCP:localhost:5000"""
waitForPort = 5000

[agent]
stack = "EXPO"
expertMode = true

[deployment]
deploymentTarget = "vm"
publicDir = "static-build"
build = ["node", "scripts/build.js"]
run = ["npx", "expo", "start", "--web", "--port", "5000", "--no-dev", "--minify"]

# Expo manifest headers
[[deployment.responseHeaders]]
path = "/*"
name = "expo-protocol-version"
value = "1"

[[deployment.responseHeaders]]
path = "/*"
name = "expo-sfv-version"
value = "0"
