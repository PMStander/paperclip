# CRM MCP Interface

Function contracts for the Paperclip CRM system. Defines the operations
available to agents (and external tools) via MCP. All operations return JSON.
IDs are UUIDs. Timestamps are ISO 8601.

Agents require the `crm:access` permission to use these tools.

---

## Contacts

### `list_crm_contacts`

List and filter contacts.

| Parameter   | Type   | Required | Notes                                       |
| ----------- | ------ | -------- | ------------------------------------------- |
| `query`     | string | no       | Free-text search across name and email      |
| `companyId` | string | no       | Filter by CRM company                       |
| `tag`       | string | no       | Filter by tag                               |
| `limit`     | number | no       | Max results. Default: 50                    |
| `after`     | string | no       | Cursor for pagination                       |

**Returns:** `{ contacts: Contact[], pageInfo }`

---

### `get_crm_contact`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** Full `Contact` object with related companies, deals, and activity.

---

### `create_crm_contact`

| Parameter   | Type     | Required |
| ----------- | -------- | -------- |
| `firstName` | string   | yes      |
| `lastName`  | string   | no       |
| `email`     | string   | no       |
| `phone`     | string   | no       |
| `title`     | string   | no       |
| `companyId` | string   | no       |
| `tags`      | string[] | no       |
| `notes`     | string   | no       |

**Returns:** Created `Contact` object.

---

### `update_crm_contact`

| Parameter   | Type     | Required |
| ----------- | -------- | -------- |
| `id`        | string   | yes      |
| `firstName` | string   | no       |
| `lastName`  | string   | no       |
| `email`     | string   | no       |
| `phone`     | string   | no       |
| `title`     | string   | no       |
| `companyId` | string   | no       |
| `tags`      | string[] | no       |
| `notes`     | string   | no       |

**Returns:** Updated `Contact` object.

---

### `archive_crm_contact`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** `{ success: true }`

---

## Companies

### `list_crm_companies`

| Parameter | Type   | Required | Notes                                  |
| --------- | ------ | -------- | -------------------------------------- |
| `query`   | string | no       | Free-text search on name and domain    |
| `limit`   | number | no       | Default: 50                            |
| `after`   | string | no       | Cursor                                 |

**Returns:** `{ companies: CrmCompany[], pageInfo }`

---

### `get_crm_company`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** Full `CrmCompany` object with contacts, deals, and activity.

---

### `create_crm_company`

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| `name`     | string | yes      |
| `domain`   | string | no       |
| `industry` | string | no       |
| `phone`    | string | no       |
| `address`  | string | no       |
| `notes`    | string | no       |

**Returns:** Created `CrmCompany` object.

---

### `update_crm_company`

| Parameter  | Type   | Required |
| ---------- | ------ | -------- |
| `id`       | string | yes      |
| `name`     | string | no       |
| `domain`   | string | no       |
| `industry` | string | no       |
| `phone`    | string | no       |
| `address`  | string | no       |
| `notes`    | string | no       |

**Returns:** Updated `CrmCompany` object.

---

### `archive_crm_company`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** `{ success: true }`

---

## Deals

### `list_crm_deals`

| Parameter   | Type   | Required | Notes                                                          |
| ----------- | ------ | -------- | -------------------------------------------------------------- |
| `query`     | string | no       | Search on deal name                                            |
| `status`    | string | no       | `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost` |
| `contactId` | string | no       | Filter by contact                                              |
| `companyId` | string | no       | Filter by company                                              |
| `limit`     | number | no       | Default: 50                                                    |
| `after`     | string | no       | Cursor                                                         |

**Returns:** `{ deals: Deal[], pageInfo }`

---

### `get_crm_deal`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** Full `Deal` object with related contact, company, quotes, and activity.

---

### `create_crm_deal`

| Parameter    | Type   | Required | Notes                                                |
| ------------ | ------ | -------- | ---------------------------------------------------- |
| `name`       | string | yes      |                                                      |
| `valueCents` | number | no       | Deal value in cents                                  |
| `status`     | string | no       | Default: `lead`                                      |
| `contactId`  | string | no       |                                                      |
| `companyId`  | string | no       |                                                      |
| `closeDateExpected` | string | no | ISO date                                        |
| `notes`      | string | no       |                                                      |

**Returns:** Created `Deal` object.

---

### `update_crm_deal`

| Parameter    | Type   | Required |
| ------------ | ------ | -------- |
| `id`         | string | yes      |
| `name`       | string | no       |
| `valueCents` | number | no       |
| `status`     | string | no       |
| `contactId`  | string | no       |
| `companyId`  | string | no       |
| `closeDateExpected` | string | no |
| `notes`      | string | no       |

**Returns:** Updated `Deal` object.

**Side effects:**
- Changing `status` to `won` sets `wonAt`
- Changing `status` to `lost` sets `lostAt`

---

### `archive_crm_deal`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** `{ success: true }`

---

## Invoices

### `list_crm_invoices`

| Parameter   | Type   | Required | Notes                                              |
| ----------- | ------ | -------- | -------------------------------------------------- |
| `status`    | string | no       | `draft`, `sent`, `paid`, `overdue`, `cancelled`   |
| `contactId` | string | no       |                                                    |
| `companyId` | string | no       |                                                    |
| `limit`     | number | no       | Default: 50                                        |
| `after`     | string | no       | Cursor                                             |

**Returns:** `{ invoices: Invoice[], pageInfo }`

---

### `get_crm_invoice`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** Full `Invoice` object with line items.

---

### `create_crm_invoice`

| Parameter   | Type         | Required | Notes                     |
| ----------- | ------------ | -------- | ------------------------- |
| `contactId` | string       | no       |                           |
| `companyId` | string       | no       |                           |
| `dealId`    | string       | no       |                           |
| `dueDate`   | string       | no       | ISO date                  |
| `lineItems` | LineItem[]   | yes      | Array of `{ productId, description, quantity, unitPriceCents }` |
| `notes`     | string       | no       |                           |

**Returns:** Created `Invoice` object with computed `totalCents`.

---

### `update_crm_invoice`

| Parameter   | Type       | Required |
| ----------- | ---------- | -------- |
| `id`        | string     | yes      |
| `status`    | string     | no       |
| `dueDate`   | string     | no       |
| `lineItems` | LineItem[] | no       |
| `notes`     | string     | no       |

**Returns:** Updated `Invoice` object.

**Side effects:**
- Changing `status` to `paid` sets `paidAt`
- Changing `status` to `sent` sets `sentAt`

---

## Quotes

### `list_crm_quotes`

| Parameter   | Type   | Required | Notes                                                   |
| ----------- | ------ | -------- | ------------------------------------------------------- |
| `status`    | string | no       | `draft`, `sent`, `accepted`, `rejected`, `expired`     |
| `contactId` | string | no       |                                                         |
| `dealId`    | string | no       |                                                         |
| `limit`     | number | no       | Default: 50                                             |
| `after`     | string | no       | Cursor                                                  |

**Returns:** `{ quotes: Quote[], pageInfo }`

---

### `get_crm_quote`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** Full `Quote` object with line items.

---

### `create_crm_quote`

| Parameter   | Type       | Required | Notes                                                   |
| ----------- | ---------- | -------- | ------------------------------------------------------- |
| `contactId` | string     | no       |                                                         |
| `companyId` | string     | no       |                                                         |
| `dealId`    | string     | no       |                                                         |
| `validUntil`| string     | no       | ISO date                                                |
| `lineItems` | LineItem[] | yes      | Array of `{ productId, description, quantity, unitPriceCents }` |
| `notes`     | string     | no       |                                                         |

**Returns:** Created `Quote` object with computed `totalCents`.

---

### `update_crm_quote`

| Parameter   | Type       | Required |
| ----------- | ---------- | -------- |
| `id`        | string     | yes      |
| `status`    | string     | no       |
| `validUntil`| string     | no       |
| `lineItems` | LineItem[] | no       |
| `notes`     | string     | no       |

**Returns:** Updated `Quote` object.

**Side effects:**
- Changing `status` to `accepted` can auto-create an invoice (if configured)

---

## Products

### `list_crm_products`

| Parameter | Type   | Required | Notes                         |
| --------- | ------ | -------- | ----------------------------- |
| `query`   | string | no       | Search on name/SKU            |
| `limit`   | number | no       | Default: 50                   |
| `after`   | string | no       | Cursor                        |

**Returns:** `{ products: Product[], pageInfo }`

---

### `get_crm_product`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** Single `Product` object.

---

### `create_crm_product`

| Parameter      | Type   | Required |
| -------------- | ------ | -------- |
| `name`         | string | yes      |
| `sku`          | string | no       |
| `description`  | string | no       |
| `unitPriceCents` | number | no     |
| `currency`     | string | no       | Default: `USD` |
| `taxRate`      | number | no       | Percentage      |

**Returns:** Created `Product` object.

---

### `update_crm_product`

| Parameter      | Type   | Required |
| -------------- | ------ | -------- |
| `id`           | string | yes      |
| `name`         | string | no       |
| `sku`          | string | no       |
| `description`  | string | no       |
| `unitPriceCents` | number | no     |
| `currency`     | string | no       |
| `taxRate`      | number | no       |

**Returns:** Updated `Product` object.

---

### `archive_crm_product`

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `id`      | string | yes      |

**Returns:** `{ success: true }`

---

## Summary

| Entity    | list | get | create | update | archive |
| --------- | ---- | --- | ------ | ------ | ------- |
| Contact   | ✓    | ✓   | ✓      | ✓      | ✓       |
| Company   | ✓    | ✓   | ✓      | ✓      | ✓       |
| Deal      | ✓    | ✓   | ✓      | ✓      | ✓       |
| Invoice   | ✓    | ✓   | ✓      | ✓      | —       |
| Quote     | ✓    | ✓   | ✓      | ✓      | —       |
| Product   | ✓    | ✓   | ✓      | ✓      | ✓       |

**Total: 28 operations**

All CRM tools are prefixed with `crm_` to avoid collision with the existing
task management MCP interface. Agents with `crm:access` permission can manage
the full CRM lifecycle: track contacts, build deal pipelines, generate quotes,
and issue invoices.
