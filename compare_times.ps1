# Compare our GAMES times with Exame reference
param([string]$htmlFile = "index.html")

$html = Get-Content $htmlFile -Raw

# Extract GAMES JSON
$startIdx = $html.IndexOf('<script>const GAMES = [')
$startIdx += '<script>const GAMES = '.Length
$endIdx = $html.IndexOf("`nconst GROUPS", $startIdx)
$segment = $html.Substring($startIdx, $endIdx - $startIdx)
$lastBracket = $segment.LastIndexOf(']')
$gamesJson = $segment.Substring(0, $lastBracket + 1)
$pattern = '<script>const GAMES = '
$jsonOnly = $gamesJson.Substring($pattern.Length)

$games = $jsonOnly | ConvertFrom-Json

# Exame reference: n, date, time, teamA, teamB
$ref = @"
n|date|time|teamA|teamB
1|11/06|16:00|México|África do Sul
2|11/06|23:00|Coreia do Sul|República Tcheca
3|12/06|16:00|Canadá|Bósnia
4|12/06|22:00|Estados Unidos|Paraguai
5|13/06|16:00|Catar|Suíça
6|13/06|19:00|Brasil|Marrocos
7|13/06|22:00|Haiti|Escócia
8|13/06|01:00|Austrália|Turquia
9|14/06|14:00|Alemanha|Curaçao
10|14/06|17:00|Holanda|Japão
11|14/06|20:00|Costa do Marfim|Equador
12|14/06|23:00|Suécia|Tunísia
13|15/06|13:00|Espanha|Cabo Verde
14|15/06|16:00|Bélgica|Egito
15|15/06|19:00|Arábia Saudita|Uruguai
16|15/06|22:00|Irã|Nova Zelândia
17|16/06|22:00|Argentina|Argélia
18|16/06|16:00|França|Senegal
19|16/06|19:00|Iraque|Noruega
20|17/06|01:00|Áustria|Jordânia
21|17/06|14:00|Portugal|RD Congo
22|17/06|17:00|Inglaterra|Croácia
23|17/06|20:00|Gana|Panamá
24|17/06|23:00|Uzbequistão|Colômbia
25|18/06|13:00|República Tcheca|África do Sul
26|18/06|16:00|Suíça|Bósnia
27|18/06|19:00|Canadá|Catar
28|18/06|22:00|México|Coreia do Sul
29|19/06|01:00|Turquia|Paraguai
30|19/06|16:00|Estados Unidos|Austrália
31|19/06|19:00|Escócia|Marrocos
32|19/06|22:00|Brasil|Haiti
33|20/06|14:00|Holanda|Suécia
34|20/06|17:00|Alemanha|Costa do Marfim
35|20/06|21:00|Equador|Curaçao
36|21/06|01:00|Tunísia|Japão
37|21/06|13:00|Espanha|Arábia Saudita
38|21/06|16:00|Bélgica|Irã
39|21/06|19:00|Uruguai|Cabo Verde
40|21/06|22:00|Nova Zelândia|Egito
41|22/06|14:00|Argentina|Áustria
42|22/06|18:00|França|Iraque
43|22/06|21:00|Noruega|Senegal
44|23/06|00:00|Jordânia|Argélia
45|23/06|14:00|Portugal|Uzbequistão
46|23/06|17:00|Inglaterra|Gana
47|23/06|20:00|Panamá|Croácia
48|23/06|23:00|Colômbia|RD Congo
"@

$refLines = $ref -split "`n" | Where-Object { $_ -ne "" }
$refMap = @{}
for($i=1; $i -lt $refLines.Count; $i++){
    $parts = $refLines[$i] -split "\|"
    $n = [int]$parts[0]
    $refMap[$n] = @{
        date = $parts[1]
        time = $parts[2]
        a = $parts[3]
        b = $parts[4]
    }
}

Write-Output "=== GROUP STAGE TIME COMPARISON (Games 1-72) ==="
Write-Output "Comparing vs Exame/April reference (BRT)"
Write-Output ""

$discrepancies = @()

foreach($g in $games){
    $n = $g.n
    if($n -gt 72){ continue }
    
    $r = $refMap[$n]
    if(-not $r){ 
        Write-Output "Game $n - NO REFERENCE ENTRY"
        continue 
    }
    
    # Our date (day only, without weekday)
    $ourDate = ($g.d -split ' ')[0]
    $ourTime = $g.t
    $refDate = $r.date
    $refTime = $r.time
    
    $issues = @()
    if($ourDate -ne $refDate){ $issues += "DATE: ours=$ourDate ref=$refDate" }
    if($ourTime -ne $refTime){ $issues += "TIME: ours=$ourTime ref=$refTime" }
    
    # Check teams match (order may differ)
    $ourA = $g.a
    $ourB = $g.b
    $refA = $r.a
    $refB = $r.b
    $teamsMatch = ($ourA -eq $refA -and $ourB -eq $refB) -or ($ourA -eq $refB -and $ourB -eq $refA)
    if(-not $teamsMatch){ $issues += "TEAMS: ours=$ourA vs $ourB ref=$refA vs $refB" }
    
    if($issues.Count -gt 0){
        $discrepancies += [PSCustomObject]@{
            Game = $n
            Our = "$ourDate $ourTime - $ourA vs $ourB"
            Ref = "$refDate $refTime - $refA vs $refB"
            Issues = ($issues -join "; ")
        }
    }
}

if($discrepancies.Count -eq 0){
    Write-Output "All 48 group stage games match Exame reference! ✓"
} else {
    Write-Output "DISCREPANCIES: $($discrepancies.Count)"
    $discrepancies | Format-Table -AutoSize
}

# Now knockout stage
Write-Output ""
Write-Output "=== KNOCKOUT STAGE COMPARISON (Games 73-104) ==="
Write-Output ""

$koRef = @"
n|date|time|phase
73|28/06|16:00|Rodada de 32
74|29/06|17:30|Rodada de 32
75|29/06|22:00|Rodada de 32
76|29/06|14:00|Rodada de 32
77|30/06|18:00|Rodada de 32
78|30/06|14:00|Rodada de 32
79|30/06|22:00|Rodada de 32
80|01/07|13:00|Rodada de 32
81|01/07|21:00|Rodada de 32
82|01/07|17:00|Rodada de 32
83|02/07|20:00|Rodada de 32
84|02/07|16:00|Rodada de 32
85|02/07|00:00|Rodada de 32
86|03/07|19:00|Rodada de 32
87|03/07|22:30|Rodada de 32
88|03/07|15:00|Rodada de 32
89|04/07|18:00|Oitavas
90|04/07|14:00|Oitavas
91|05/07|17:00|Oitavas
92|05/07|21:00|Oitavas
93|06/07|16:00|Oitavas
94|06/07|21:00|Oitavas
95|07/07|13:00|Oitavas
96|07/07|17:00|Oitavas
97|09/07|17:00|Quartas
98|10/07|16:00|Quartas
99|11/07|18:00|Quartas
100|11/07|22:00|Quartas
101|14/07|16:00|Semifinal
102|15/07|16:00|Semifinal
103|18/07|18:00|3o Lugar
104|19/07|16:00|Final
"@
$koLines = $koRef -split "`n" | Where-Object { $_ -ne "" }
$koMap = @{}
for($i=1; $i -lt $koLines.Count; $i++){
    $parts = $koLines[$i] -split "\|"
    $n = [int]$parts[0]
    $koMap[$n] = @{
        date = $parts[1]
        time = $parts[2]
        phase = $parts[3]
    }
}

$koIssues = @()
foreach($g in $games){
    $n = $g.n
    if($n -lt 73){ continue }
    $r = $koMap[$n]
    if(-not $r){ Write-Output "Game $n - NO REFERENCE"; continue }
    
    $ourDate = ($g.d -split ' ')[0]
    $ourTime = $g.t
    $ourPhase = $g.f
    $refDate = $r.date
    $refTime = $r.time
    $refPhase = $r.phase
    
    $issues = @()
    if($ourDate -ne $refDate){ $issues += "DATE: ours=$ourDate ref=$refDate" }
    if($ourTime -ne $refTime){ $issues += "TIME: ours=$ourTime ref=$refTime" }
    
    # Map our phase names
    $phaseMap = @{
        "Rodada de 32" = "Rodada de 32"
        "Oitavas de Final" = "Oitavas"
        "Quartas de Final" = "Quartas"
        "Semifinal" = "Semifinal"
        "3o Lugar" = "3o Lugar"
        "3º Lugar" = "3o Lugar"
        "Final" = "Final"
    }
    $ourPhaseNorm = $phaseMap[$ourPhase]
    if($ourPhaseNorm -and $ourPhaseNorm -ne $refPhase -and $refPhase -ne "Rodada de 32"){
        # Skip phase mismatch for Rodada de 32 since both "Rodada de 32" and "32 avos" are the same
    }
    
    if($issues.Count -gt 0){
        $koIssues += [PSCustomObject]@{
            Game = $n
            Our = "$ourDate $ourTime"
            Ref = "$refDate $refTime"
            Phase = $g.f
            Issues = ($issues -join "; ")
        }
    }
}

if($koIssues.Count -eq 0){
    Write-Output "All 32 knockout games match reference! ✓"
} else {
    Write-Output "DISCREPANCIES: $($koIssues.Count)"
    $koIssues | Format-Table -AutoSize
}

Write-Output ""
Write-Output "=== SUMMARY ==="
$allIssues = @()
foreach($d in $discrepancies){ $allIssues += $d }
foreach($k in $koIssues){ 
    $allIssues += [PSCustomObject]@{Game=$k.Game; Our=$k.Our; Ref=$k.Ref; Issues=$k.Issues}
}
if($allIssues.Count -eq 0){
    Write-Output "ALL 104 GAMES MATCH REFERENCE ✓"
} else {
    Write-Output "TOTAL DISCREPANCIES: $($allIssues.Count) / 104 games"
    $allIssues | Sort-Object Game | Format-Table -AutoSize
}
