import { test, expect, type APIRequestContext } from "@playwright/test";

type CreatedRecords = {
  clientId?: string;
  inquiryId?: string;
  deleteInquiryId?: string;
  itemId?: string;
  deleteItemId?: string;
  quotationId?: string;
  taskId?: string;
  tokenId?: string;
  tokenValue?: string;
  assetId?: string;
  assetSerial?: string;
  completionDocId?: string;
  applicationId?: string;
};

const createClient = async (request: APIRequestContext, name: string) => {
  const res = await request.post("/api/clients", {
    data: {
      name,
      contactName: "E2E Contact",
      email: "e2e@example.com",
      phone: "+971501234567",
      address: "E2E Address",
      notes: "E2E Notes",
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createInquiry = async (request: APIRequestContext, clientId: string, title: string) => {
  const res = await request.post("/api/inquiries", {
    data: {
      clientId,
      title,
      notes: "E2E inquiry notes",
      siteAddress: "E2E Site Address",
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createItem = async (request: APIRequestContext, name: string) => {
  const res = await request.post("/api/items", {
    data: {
      name,
      description: "E2E item",
      unitPrice: 100,
      taxPercent: 5,
      marginPercent: 10,
      uom: "Unit",
      category: "E2E",
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createQuotation = async (request: APIRequestContext, clientId: string, title: string, itemId: string) => {
  const res = await request.post("/api/quotations", {
    data: {
      clientId,
      title,
      items: [{ itemId, quantity: 2 }],
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createTask = async (request: APIRequestContext, title: string, inquiryId?: string) => {
  const res = await request.post("/api/tasks", {
    data: {
      title,
      description: "E2E task",
      dueDate: new Date().toISOString(),
      inquiryId,
      status: "OPEN",
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createToken = async (request: APIRequestContext, clientId: string, inquiryId: string) => {
  const res = await request.post("/api/tokens", {
    data: {
      clientId,
      inquiryId,
      allowDownload: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createExecutionAsset = async (request: APIRequestContext, inquiryId: string) => {
  const res = await request.post("/api/execution-assets", {
    data: {
      inquiryId,
      assetType: "PANEL",
      serialNo: `E2E-SERIAL-${Date.now()}`,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createCompletionDoc = async (request: APIRequestContext, inquiryId: string, name: string) => {
  const res = await request.post("/api/completion-docs", {
    data: {
      inquiryId,
      name,
      fileUrl: "https://example.com/e2e-doc.pdf",
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const createApplicationData = async (request: APIRequestContext, clientId: string, inquiryId: string) => {
  const res = await request.post("/api/application-data", {
    data: {
      clientId,
      inquiryId,
      data: {
        applicantName: "E2E Applicant",
        applicantEmail: "applicant@example.com",
        applicantPhone: "+971501112223",
        applicantAddress: "E2E Applicant Address",
        consumerNumber: "123456",
        meterNumber: "MTR-123",
        sanctionedLoad: "10",
        connectionType: "RESIDENTIAL",
        roofType: "RCC",
        roofArea: "500",
        systemCapacity: "5",
        panelCount: "12",
        inverterCapacity: "5",
        notes: "E2E application notes",
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

const safeDelete = async (request: APIRequestContext, url: string) => {
  try {
    await request.delete(url);
  } catch {
    // ignore cleanup errors
  }
};

test.describe.serial("Full app UI coverage", () => {
  const created: CreatedRecords = {};
  const stamp = Date.now();
  const names = {
    client: `E2E Client ${stamp}`,
    inquiry: `E2E Inquiry ${stamp}`,
    deleteInquiry: `E2E Delete Inquiry ${stamp}`,
    item: `E2E Item ${stamp}`,
    deleteItem: `E2E Delete Item ${stamp}`,
    quotation: `E2E Quote ${stamp}`,
    task: `E2E Task ${stamp}`,
    completionDoc: `E2E Completion Doc ${stamp}`,
  };

  test.beforeAll(async ({ request }) => {
    const client = await createClient(request, names.client);
    created.clientId = client.id;

    const inquiry = await createInquiry(request, client.id, names.inquiry);
    created.inquiryId = inquiry.id;

    const deleteInquiry = await createInquiry(request, client.id, names.deleteInquiry);
    created.deleteInquiryId = deleteInquiry.id;

    const item = await createItem(request, names.item);
    created.itemId = item.id;

    const deleteItem = await createItem(request, names.deleteItem);
    created.deleteItemId = deleteItem.id;

    const quotation = await createQuotation(request, client.id, names.quotation, item.id);
    created.quotationId = quotation.id;

    const task = await createTask(request, names.task, inquiry.id);
    created.taskId = task.id;

    const token = await createToken(request, client.id, inquiry.id);
    created.tokenId = token.id;
    created.tokenValue = token.token;

    const asset = await createExecutionAsset(request, inquiry.id);
    created.assetId = asset.id;
    created.assetSerial = asset.serialNo;

    const doc = await createCompletionDoc(request, inquiry.id, names.completionDoc);
    created.completionDocId = doc.id;

    const application = await createApplicationData(request, client.id, inquiry.id);
    created.applicationId = application.id;
  });

  test.afterAll(async ({ request }) => {
    if (created.tokenId) await safeDelete(request, `/api/tokens/${created.tokenId}`);
    if (created.taskId) await safeDelete(request, `/api/tasks/${created.taskId}`);
    if (created.assetId) await safeDelete(request, `/api/execution-assets/${created.assetId}`);
    if (created.completionDocId) await safeDelete(request, `/api/completion-docs/${created.completionDocId}`);
    if (created.applicationId) await safeDelete(request, `/api/application-data/${created.applicationId}`);
    if (created.quotationId) await safeDelete(request, `/api/quotations/${created.quotationId}`);
    if (created.deleteItemId) await safeDelete(request, `/api/items/${created.deleteItemId}`);
    if (created.itemId) await safeDelete(request, `/api/items/${created.itemId}`);
    if (created.deleteInquiryId) await safeDelete(request, `/api/inquiries/${created.deleteInquiryId}`);
    if (created.inquiryId) await safeDelete(request, `/api/inquiries/${created.inquiryId}`);
    if (created.clientId) await safeDelete(request, `/api/clients/${created.clientId}`);
  });

  test("token access page shows documents", async ({ page }) => {
    await page.goto(`/token/${created.tokenValue}`);
    await expect(page.getByRole("heading", { name: "Client Document Access" })).toBeVisible();
    await expect(page.getByText(names.completionDoc)).toBeVisible();
  });

  test("inquiries page view + edit + delete", async ({ page }) => {
    await page.goto("/inquiries");
    await expect(page.getByRole("heading", { level: 2, name: "Inquiry Management" })).toBeVisible();
    await expect(page.getByText(names.inquiry)).toBeVisible();

    const inquiryRow = page.getByRole("row", { name: new RegExp(names.inquiry) });
    await inquiryRow.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Inquiry Details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await inquiryRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Edit Inquiry" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    const deleteInquiryRow = page.getByRole("row", { name: new RegExp(names.deleteInquiry) });
    page.once("dialog", (dialog) => dialog.accept());
    await deleteInquiryRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(names.deleteInquiry)).toHaveCount(0);
    created.deleteInquiryId = undefined;
  });

  test("items page view + edit + delete", async ({ page }) => {
    await page.goto("/items");
    await expect(page.getByRole("heading", { level: 2, name: "Item Master" })).toBeVisible();
    await expect(page.getByText(names.item)).toBeVisible();

    const itemCard = page.getByText(names.item).locator("..");
    await itemCard.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Item Details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await itemCard.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Edit Item" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    const deleteItemCard = page.getByText(names.deleteItem).locator("..");
    page.once("dialog", (dialog) => dialog.accept());
    await deleteItemCard.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(names.deleteItem)).toHaveCount(0);
    created.deleteItemId = undefined;
  });

  test("quotations page edit + delete", async ({ page }) => {
    await page.goto("/quotations");
    await expect(page.getByRole("heading", { level: 2, name: "Quotation Engine" })).toBeVisible();
    await expect(page.getByRole("cell", { name: names.quotation })).toBeVisible();

    const quoteRow = page.getByRole("row", { name: new RegExp(names.quotation) });
    await quoteRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Edit Quotation" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await quoteRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(names.quotation)).toHaveCount(0);
    created.quotationId = undefined;
  });

  test("tasks page view + edit + delete", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { level: 2, name: "Tasks & Reminders" })).toBeVisible();
    await expect(page.getByText(names.task)).toBeVisible();

    const taskCard = page.getByText(names.task).locator("..").locator("..");
    await taskCard.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Task Details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await taskCard.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Edit Task" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await taskCard.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(names.task)).toHaveCount(0);
    created.taskId = undefined;
  });

  test("tokens page view + edit + delete", async ({ page }) => {
    await page.goto("/tokens");
    await expect(page.getByRole("heading", { level: 2, name: "Client Document Tokens" })).toBeVisible();

    const tokenCard = page.getByText(created.tokenValue || "").locator("..").locator("..");
    await tokenCard.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Token Details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await tokenCard.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Edit Token" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await tokenCard.getByRole("button", { name: "Delete" }).click();
    created.tokenId = undefined;
  });

  test("execution page view + edit + delete", async ({ page }) => {
    await page.goto("/execution");
    await expect(page.getByRole("heading", { level: 2, name: "Execution & Serial Capture" })).toBeVisible();

    const assetCard = page.getByText(created.assetSerial || "").locator("..").locator("..");
    await assetCard.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Asset Details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await assetCard.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Edit Serial" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await assetCard.getByRole("button", { name: "Delete" }).click();
    created.assetId = undefined;
  });

  test("documents page edit + delete", async ({ page }) => {
    await page.goto("/documents");
    await expect(page.getByRole("heading", { level: 2, name: "Completion & Closure Pack" })).toBeVisible();
    await expect(page.getByText(names.completionDoc)).toBeVisible();

    const docCard = page.getByText(names.completionDoc).locator("..").locator("..");
    await docCard.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByText("Document Name")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await docCard.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(names.completionDoc)).toHaveCount(0);
    created.completionDocId = undefined;
  });

  test("applications page view + edit + delete", async ({ page }) => {
    await page.goto("/applications");
    await expect(
      page.getByRole("heading", { level: 2, name: "Applications & Document Generation" })
    ).toBeVisible();

    const appRow = page.getByRole("row", { name: /E2E Applicant/ });
    await appRow.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Application Details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await appRow.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByText("Applicant Details")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await appRow.getByRole("button", { name: "Delete" }).click();
    created.applicationId = undefined;
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 2, name: "Settings" })).toBeVisible();
  });
});
