$tmpdir=New-TemporaryFile | %{ rm $_; mkdir $_ }
echo "Running test in $tmpdir - please remember to cleanup"

cd $tmpdir

# don't ask..., if you must - https://stackoverflow.com/questions/5596982/using-powershell-to-write-a-file-in-utf-8-without-the-bom#comment79966549_5596984
[System.Environment]::CurrentDirectory = (Get-Location).Path

collie init .

echo "Testing foundation features"
collie foundation new f

# fake a platform config file

# equivalent of mkdir -p
md foundations/f/platforms/az/ -ea 0

# powershell needs some convicing to write files at UTF8 without BOM... this is the only thing that works
$platform_md=@"
---
id: az
name: Likvid Bank Azure
azure:
    aadTenantId: 1234-1234
    subscriptionId: 1234-1234
cli: 
    az: {}
---
# Likvid Bank Azure
Test test
"@
[System.IO.File]::WriteAllLines("foundations/f/platforms/az/README.md", $platform_md)


echo "Testing kit features"
collie kit import foundation/docs
collie kit import azure/bootstrap
collie kit apply azure/bootstrap --foundation f --platform az

collie kit new azure/dummy dummy

$variables_tf=@"
variable "my_input_var" {}
"@
[IO.File]::WriteAllLines("kit/azure/dummy/variables.tf", $variables_tf)

collie kit apply azure/dummy --foundation f --platform az

collie foundation deploy --auto-approve

echo "Testing compliance features"
collie compliance import cfmm

echo "Testing outputs"
collie foundation tree
collie kit tree
collie compliance tree
