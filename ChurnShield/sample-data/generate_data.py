import csv, random, datetime, os, sys
outdir=sys.argv[1] if len(sys.argv)>1 else "."
random.seed(2026)
first=["Andi","Budi","Citra","Dewi","Eko","Fitri","Gilang","Hana","Indra","Joko","Kartika","Lestari","Maya","Nanda","Oki","Putri","Rizky","Sari","Teguh","Wulan","Yoga","Zahra","Rina","Fajar","Bayu","Dimas","Ayu","Reza","Nisa","Arif"]
last=["Pratama","Saputra","Wijaya","Lestari","Hidayat","Nugroho","Kusuma","Santoso","Permata","Siregar","Halim","Utami","Ramadhan","Setiawan","Anggraini"]
cities=["Jakarta","Bekasi","Depok","Tangerang","Bogor","Bandung","Surabaya","Semarang","Medan","Makassar"]
plans=[("HomeNet 30 Mbps",250000),("HomeNet 50 Mbps",330000),("HomeNet 100 Mbps",450000),("HomeNet 300 Mbps",750000),("BizNet Office 100 Mbps",950000)]
complaints_hi=["Internet putus-putus setiap malam, sudah lapor 3 kali belum beres","Kecepatan jauh di bawah paket, kerja dari rumah terganggu","Teknisi tidak datang sesuai jadwal, kecewa dengan layanan","Sering disconnect saat meeting online, mempertimbangkan pindah provider","Latency tinggi saat jam sibuk, game dan video call lag"]
complaints_lo=["Tanya cara ganti password WiFi","Minta info upgrade paket","Tagihan sudah sesuai, hanya konfirmasi",""]
now=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).replace(microsecond=0)
cust=[];tix=[]
for i in range(1,151):
    code=f"CUST-{i:04d}"; plan,fee=random.choice(plans)
    risky = random.random()<0.16
    if risky:
        out=random.randint(3,9); pl=round(random.uniform(2.5,8.0),2); lat=random.randint(80,220); comp=random.randint(2,6)
        left=random.choice([0,1,2,3,6]); ten=random.randint(4,36); lc=random.choice(complaints_hi)
    else:
        out=random.choice([0,0,0,1,1,2]); pl=round(random.uniform(0.1,1.5),2); lat=random.randint(12,60); comp=random.choice([0,0,0,1]); left=random.randint(1,24); ten=random.randint(2,72); lc=random.choice(complaints_lo) if comp else ""
    cust.append(dict(CustomerCode=code,CustomerName=f"{random.choice(first)} {random.choice(last)}",ServicePlan=plan,MonthlyFee=fee,TenureMonths=ten,ContractMonthsLeft=left,City=random.choice(cities),ContactEmail=f"pelanggan{i:03d}@example.com",Outages30d=out,AvgPacketLoss=pl,AvgLatencyMs=lat,Complaints30d=comp,LastComplaint=lc))
    nt = random.randint(1,2) if risky else (1 if random.random()<0.12 else 0)
    for k in range(nt):
        sla=random.choice([24,24,48])
        age = random.randint(30,96) if (risky and k==0 and random.random()<0.75) else random.randint(1,20)
        cat=random.choice(["Gangguan koneksi","Kecepatan rendah","Perangkat ONT","Instalasi ulang"])
        tix.append(dict(TicketCode=f"TKT-{len(tix)+1:05d}",CustomerCode=code,Category=cat,Description=f"{cat} dilaporkan pelanggan {code}",OpenedAt=(now-datetime.timedelta(hours=age)).isoformat(),SlaHours=sla,TicketStatus="Open",Escalated="false",EscalationNote=""))
def w(fn,rows):
    with open(fn,"w",newline="",encoding="utf-8") as f:
        wr=csv.DictWriter(f,fieldnames=list(rows[0].keys())); wr.writeheader(); wr.writerows(rows)
w(os.path.join(outdir,"customers.csv"),cust); w(os.path.join(outdir,"tickets.csv"),tix)
print(len(cust),"customers,",sum(1 for c in cust if c["Outages30d"]>=3),"risky;",len(tix),"tickets")
