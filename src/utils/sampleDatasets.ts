/**
 * Realistic business intelligence sample datasets for Sheet2Dashboard
 */

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  category: 'Sales' | 'Inventory' | 'Operations' | 'OCR Image';
  filename: string;
  data: string; // CSV or Base64
  isImage?: boolean;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'sales_performance',
    name: 'Sales Revenue & Targets (Clean BI)',
    description: 'Quarterly sales by Region, Rep, and Product Category with Target comparisons and dates.',
    category: 'Sales',
    filename: 'quarterly_sales_performance.csv',
    data: `Date,Region,Sales_Rep,Product_Category,Units_Sold,Revenue,Target_Revenue,Margin_Pct
2025-01-05,North America,Sarah Jenkins,Cloud Services,140,$42000,$38000,28.5%
2025-01-08,Europe,Lucas Meyer,Hardware Systems,45,$67500,$60000,22.0%
2025-01-12,Asia Pacific,Kenji Sato,Cloud Services,180,$54000,$50000,31.0%
2025-01-15,Latin America,Elena Gomez,Software Licenses,95,$28500,$30000,35.2%
2025-01-19,North America,Sarah Jenkins,Software Licenses,110,$33000,$32000,34.0%
2025-01-23,Europe,Lucas Meyer,Cloud Services,130,$39000,$40000,29.5%
2025-01-27,Asia Pacific,Kenji Sato,Hardware Systems,38,$57000,$52000,21.5%
2025-02-02,North America,Marcus Vance,Consulting,75,$26250,$25000,42.0%
2025-02-06,Europe,Lucas Meyer,Software Licenses,125,$37500,$35000,36.0%
2025-02-10,Asia Pacific,Mei Ling,Cloud Services,210,$63000,$55000,30.5%
2025-02-14,Latin America,Elena Gomez,Hardware Systems,52,$78000,$70000,23.5%
2025-02-18,North America,Sarah Jenkins,Hardware Systems,60,$90000,$85000,24.0%
2025-02-22,Europe,Anna Weber,Consulting,90,$31500,$28000,44.5%
2025-02-26,Asia Pacific,Kenji Sato,Software Licenses,160,$48000,$45000,33.5%
2025-03-02,North America,Marcus Vance,Cloud Services,155,$46500,$42000,29.0%
2025-03-06,Latin America,Elena Gomez,Consulting,65,$22750,$24000,41.0%
2025-03-10,Europe,Lucas Meyer,Hardware Systems,48,$72000,$68000,22.5%
2025-03-14,Asia Pacific,Mei Ling,Consulting,85,$29750,$27000,43.0%
2025-03-18,North America,Sarah Jenkins,Cloud Services,190,$57000,$50000,30.0%
2025-03-22,Europe,Anna Weber,Software Licenses,140,$42000,$38000,35.0%
2025-03-26,Asia Pacific,Kenji Sato,Hardware Systems,42,$63000,$58000,22.0%
2025-03-30,North America,Marcus Vance,Software Licenses,130,$39000,$36000,34.5%`,
  },
  {
    id: 'messy_inventory',
    name: 'Messy Warehouse Inventory (Mixed Units & Outliers)',
    description: 'Demonstrates mixed unit detection (bars, sheets, rolls, kg) and extreme statistical outlier flagging.',
    category: 'Inventory',
    filename: 'warehouse_raw_inventory.csv',
    data: `SKU_Code,Item_Description,Warehouse_Bay,Unit_Of_Measure,Quantity_On_Hand,Unit_Cost,Total_Valuation,Spike_Flag
STL-101,Structural Steel Beams,Bay A-1,bars,120,$45.00,$5400.00,Normal
STL-102,Sheet Metal 2mm,Bay A-2,sheets,450,$22.50,$10125.00,Normal
COP-201,Copper Wire 100m,Bay B-1,rolls,85,$110.00,$9350.00,Normal
ALU-301,Aluminum Ingot,Bay B-3,kg,2400,$4.20,$10080.00,Normal
STL-103,Heavy Steel Plates,Bay A-3,sheets,60,$320.00,$19200.00,Normal
COP-202,Copper Tubing,Bay B-2,bars,310,$38.00,$11780.00,Normal
RUB-401,Industrial Rubber Seal,Bay C-1,rolls,180,$18.50,$3330.00,Normal
PLT-501,Polymer Granules,Bay C-2,kg,5200,$2.10,$10920.00,Normal
STL-999,Prototype Titanium Bar,Bay A-1,bars,8,$9500.00,$76000.00,OUTLIER_SPIKE
ALU-302,Extruded Aluminum Angle,Bay B-4,bars,540,$14.00,$7560.00,Normal
COP-203,Grounding Wire,Bay B-1,rolls,95,$62.00,$5890.00,Normal
RUB-402,High Temp Gaskets,Bay C-3,sheets,340,$9.80,$3332.00,Normal
STL-104,Reinforcing Rebar,Bay A-4,bars,820,$16.50,$13530.00,Normal
ALU-303,Aluminum Foil Industrial,Bay B-5,rolls,120,$75.00,$9000.00,Normal
PLT-502,Reinforced Epoxy Resin,Bay C-4,kg,1800,$8.50,$15300.00,Normal`,
  },
  {
    id: 'operations_workorders',
    name: 'Engineering Operations & Work Orders',
    description: 'Work order logs by Department, Priority, and Assigned Engineer with billable hours and status.',
    category: 'Operations',
    filename: 'operations_work_orders.csv',
    data: `Ticket_ID,Department,Priority,Assigned_Engineer,Logged_Hours,Hourly_Rate,Total_Billed,Status
WO-801,Infrastructure,High,Dave Miller,34,$120.00,$4080.00,Completed
WO-802,Security,Critical,Elena Chen,18,$160.00,$2880.00,Completed
WO-803,App Dev,Medium,Sam Rivera,42,$110.00,$4620.00,In Progress
WO-804,Data Systems,High,Priya Sharma,29,$135.00,$3915.00,Completed
WO-805,Infrastructure,Low,Dave Miller,12,$120.00,$1440.00,Completed
WO-806,Security,High,Elena Chen,26,$160.00,$4160.00,In Progress
WO-807,App Dev,Critical,Sam Rivera,55,$110.00,$6050.00,Completed
WO-808,Data Systems,Medium,Priya Sharma,38,$135.00,$5130.00,Completed
WO-809,Infrastructure,Medium,Dave Miller,21,$120.00,$2520.00,Completed
WO-810,App Dev,Low,Sam Rivera,15,$110.00,$1650.00,Completed
WO-811,Security,Medium,Elena Chen,22,$160.00,$3520.00,Completed
WO-812,Data Systems,Critical,Priya Sharma,48,$135.00,$6480.00,Completed`,
  },
];
