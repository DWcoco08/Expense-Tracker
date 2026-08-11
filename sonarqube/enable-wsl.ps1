$ErrorActionPreference = "Stop"

$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script as Administrator."
}

Enable-WindowsOptionalFeature `
  -Online `
  -FeatureName Microsoft-Windows-Subsystem-Linux `
  -All `
  -NoRestart

Enable-WindowsOptionalFeature `
  -Online `
  -FeatureName VirtualMachinePlatform `
  -All `
  -NoRestart

Write-Host "WSL 2 features enabled. Restart Windows to finish installation."
