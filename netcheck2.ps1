Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object Name, InterfaceDescription, Status, LinkSpeed | Format-Table -AutoSize
