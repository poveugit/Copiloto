Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\swami\.gemini\antigravity\brain\c35c0457-4806-478c-9fdd-7b75c3697430\mochilinha_app_icon_1794343719229.jpg"
$baseResDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found: $sourcePath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
Write-Output "Source image loaded: $($srcBmp.Width)x$($srcBmp.Height)"

# Pegar a cor de fundo do canto superior esquerdo
$cornerColor = $srcBmp.GetPixel(5, 5)
$hexBg = "#{0:X2}{1:X2}{2:X2}" -f $cornerColor.R, $cornerColor.G, $cornerColor.B
Write-Output "Corner Background Color: $hexBg"

# Definir as densidades e dimensões
$densities = @(
    @{ Name = "mipmap-mdpi";    Square = 48;  Foreground = 108 },
    @{ Name = "mipmap-hdpi";    Square = 72;  Foreground = 162 },
    @{ Name = "mipmap-xhdpi";   Square = 96;  Foreground = 216 },
    @{ Name = "mipmap-xxhdpi";  Square = 144; Foreground = 324 },
    @{ Name = "mipmap-xxxhdpi"; Square = 192; Foreground = 432 }
)

function Resize-Image {
    param (
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [bool]$isRound = $false,
        [float]$innerScale = 1.0,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent
    )

    $targetBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $brush = New-Object System.Drawing.SolidBrush($bgColor)
        $g.FillRectangle($brush, 0, 0, $width, $height)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    if ($isRound) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $width, $height)
        $g.SetClip($path)
    }

    if ($innerScale -ne 1.0) {
        $destW = [int]($width * $innerScale)
        $destH = [int]($height * $innerScale)
        $destX = [int](($width - $destW) / 2)
        $destY = [int](($height - $destH) / 2)
        $g.DrawImage($img, (New-Object System.Drawing.Rectangle($destX, $destY, $destW, $destH)), 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
    } else {
        $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $width, $height)), 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
    }

    $g.Dispose()
    return $targetBmp
}

foreach ($d in $densities) {
    $dir = Join-Path $baseResDir $d.Name
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # 1. ic_launcher.png (Quadrado / Full)
    $sqBmp = Resize-Image -img $srcBmp -width $d.Square -height $d.Square
    $sqPath = Join-Path $dir "ic_launcher.png"
    $sqBmp.Save($sqPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sqBmp.Dispose()

    # 2. ic_launcher_round.png (Circular)
    $rndBmp = Resize-Image -img $srcBmp -width $d.Square -height $d.Square -isRound $true
    $rndPath = Join-Path $dir "ic_launcher_round.png"
    $rndBmp.Save($rndPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $rndBmp.Dispose()

    # 3. ic_launcher_foreground.png (Adaptive icon foreground, 72% safe zone para caber no viewport do Android sem cortar)
    $fgBmp = Resize-Image -img $srcBmp -width $d.Foreground -height $d.Foreground -innerScale 0.72 -isRound $true
    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Output "Generated icons for $($d.Name): $sqPath, $rndPath, $fgPath"
}

$srcBmp.Dispose()

# Atualizar o ic_launcher_background.xml com a cor detectada ou fundo escuro
$bgXmlPath = Join-Path $baseResDir "values\ic_launcher_background.xml"
$bgXmlContent = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$hexBg</color>
</resources>
"@
Set-Content -Path $bgXmlPath -Value $bgXmlContent -Encoding UTF8
Write-Output "Updated $bgXmlPath with $hexBg"
