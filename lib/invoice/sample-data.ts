import type { InvoiceData } from "./types";

// A complete, realistic sample used by the /invoice "Load sample" button so a
// visitor can see how the selected template renders real data. `templateKey` is
// intentionally omitted — the button preserves the user's current selection.
// Static dates keep the snapshot test deterministic.
export const sampleInvoiceData: InvoiceData = {
  sender: {
    name: "Northwind Creative Studio",
    address: "742 Evergreen Terrace, Portland, OR 97201",
    email: "billing@northwind.creative",
    phone: "+1 (503) 555 0142",
  },
  recipient: {
    name: "Cascade Retail Group",
    address: "1180 NW Lovejoy St, Portland, OR 97209",
    email: "accounts@cascade.retail",
    phone: "+1 (503) 555 0199",
  },
  invoiceNumber: "NW-2026-014",
  issueDate: "2026-08-14",
  dueDate: "2026-08-28",
  items:[
    {
      "id": "s1",
      "description": "Brand identity & logo design",
      "quantity": 1,
      "unitPrice": 4200,
      "notes": "3 concepts, 2 revision rounds"
    },
    {
      "id": "s2",
      "description": "Landing page — design and build",
      "quantity": 1,
      "unitPrice": 3800,
      "notes": "Responsive, CMS-ready"
    },
    {
      "id": "s3",
      "description": "Design consultation (hourly)",
      "quantity": 8,
      "unitPrice": 95,
      "notes": "Product strategy sessions"
    },
    {
      "id": "s4",
      "description": "Fourth item",
      "quantity": 1,
      "unitPrice": 25,
      "notes": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"
    },
    {
      "id": "s5",
      "description": "Custom UI component library",
      "quantity": 1,
      "unitPrice": 1850,
      "notes": "Figma design system & reusable web components"
    },
    {
      "id": "s6",
      "description": "SEO & performance optimization",
      "quantity": 1,
      "unitPrice": 600,
      "notes": "Meta tags, image compression, speed audit"
    },
    {
      "id": "s7",
      "description": "Monthly site maintenance retainer",
      "quantity": 3,
      "unitPrice": 450,
      "notes": "Q3 hosting management & security updates"
    }
  ],
  notes: "Payment due within 14 days. Late payments incur 1.5% monthly interest.",
  taxEnabled: true,
  taxRate: 11,
  currency: "$",
  decimalSeparator: ",",
  thousandSeparator: ".",
  logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAEHUlEQVR4nO3b91bVQBAG8HkCsaJIURGxAIqKiAUVES9SLdjFir33rth7RbF3fbTsbp4C3WxyruearCWTrMmZ73xP8PsnJzsz0LnU6sxYHRmro1m2fZnTFqutxWprlW1tc9putbRbLR2yyzqdLreal1vNK6zMCiuz0sqsZEtXOe1iTV2sabXskjVO17LGtaxxnezi9U43sIYNrGGj7KJNTrvZwm62cLPsgi1Ot7L6rax+m+z87U53sHk72LweNreHzd0pO2eX092sbjer2yM7e6/Tfax2H6/dLzvrgNODvOYgrzkkO/Ow0yN8xhE+46js9GNOj/Pq47z6hOy0k05PcSAdjc7UUxxIR6Mz9TQH0tHoVCkg0gnSqTrDgXQ0Oh4Q6QToVJ7lQDoaHQlEOhqdynMcSEejU6GASCdIp+I8B9LR6HhApBOgM+UCB9LR6Egg0tHoTLnIgXQ0OpMVEOkE6Uy+xIF0NDoeEOkE6Ey6zIF0NDoSiHQ0OpN6OZCORmdiLwfS0ehMvMLBuM6ANmZ1FJAZHb3LrzGiU35VQMw6f+vya+LU8YBi0QlP83Pi0Sm/JiCJOq5R9DoTrgmIWicKmp8Tqc6E6wISraMSnY4LlGgdlYh0ym4ISIGOShQ6HlDydVwjbJ2ymwKS8s36k6DrjL8pIDU6rhGqzvhbAtKko4Ko4wL9V38S4YOoU3pbQMp0VLB0PCCkf3TTLNlg6ZTeEWDwBSO6YOmMuyMgfToqKDrj7grAehs0DZIbFJ2xCiiGl9P4g6Iz9p6AVOqohNfxgELPJExT+Ce8zpj7AlAmNqYp/BNeRwKhzLNMU/gnvM6YBwJQpn2mKfwTXqdEAYWfhZqm8E94nZKHAlAmxaYp/BNexwMKPUc3TeGf8DrFjwSgbBmYpvBPeB0JhLKDYZrCP+F1ih8LwNpQMa2RGxSdIgWEsr9jGiQ3KDpFTwRgbTeZBskNio4HhLT7ZdokGyydwqcCEDfjTLNkg6UjgRD3Bk2zZIOlU9gnAHer0rTMAK7O6D4BuDunpnEGFBCWzuhnAtA3ctOk4wKh7yunRqfguYAotrlNAaHreEAR7LqnQ6egX0B0lwAp0BnVLyDSO4mk64x6ISDqK5JE67hAMdzYREETxTcrR2fkSwGxXSAlUccDivE+C4UmNp2RrwSYul77WxfEF4w/18l/JcD4bd9vXJBeTv9NJ/+1Df/J5SPKHB1dxwUinSCdEW9sIB2NjgdEOgE6I97aQDoaneFvbSAdjc7wdzaQjkZnmAIinSCdYe9tIB2NjgdEOgE6Qz/YQDoaHQlEOhqdoR9tIB2NzhAFRDpBOkM+2UA6Gh0PiHQCdAZ/toF0NDoSiHQ0OoO/2EA6Gp08BUQ6QTp5X20gHY2OB0Q6ATqDvtlAOhqdH0DfAYn5s7/7s6/lAAAAAElFTkSuQmCC",
  paymentInfo: {
    bankName: "First Cascadia Bank",
    accountNumber: "0098-7722-4401",
    routingCode: "121000358",
    paymentMethods: ["Bank transfer", "Credit card", "PayPal"],
    paymentQRCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASgAAAEoCAAAAADObDPFAAAEi0lEQVR4nO3WQXYUOxBFQe9/0zDQOR7QX86rqgK+6Xizcj8pU8GEjx+S8vG3F/guARUDKgZUDKgYUDGgYkDFgIoBFQMqBlQMqBhQMaBiQMWAigEVAyoGVAyoGFAxoGJAxYCKARUDKgZUDKgYUDGgYkaoj4uZ7vn177vvus/T+4KK+4KK+4KK+4KK+4KK+4KK+4KK+16GmnpTvz5sd0992FP7vvSeumjqg4p9ULEPKvZBxT6o2AcV+28H9evCdx94+vfp3rv7bueNBVCrNxZArd5YALV6YwHU6o0FUKs3FkCt3lgAtXpj4WGoCnn1gaBAgQIFChQoUP8q1Om80x6o2AMVe6BiD1TsgYo9ULEHKvb+N1Cn/QpXHzTtc3ffbe+pi3Z9ULEPKvZBxT6o2AcV+6Bi/+2gTrNb5E99X90XVNwXVNwXVNwXVNwXVNwXVNwXVNz3MtTd7BY5XXR33+n5qwFV5/72AaDiAFBxAKg4AFQcACoOeBeo3WJT6j2nc+q+p/uN99bBdxcBBersAaBArXvr4LuLgAJ19oC3h6qLXwWa/l73uAqT506FacFpIChQZwtOA0GBOltwGggK1NmC08C3hZr+PvUqeH1o3fNuQNV77y4AKi4AKi4AKi4AKi4AKi4AajP46gPq+Qo1we/23n2Pe9eH1YfW+0DF+0DF+0DF+0DF+0DF+0DF+/45qLrYtFB98DT/8kPjnO35q4NAxUGg4iBQcRCoOAhUHAQqDgIVB97tVejp3Ok/3OX3TIXLF4MClQIqBlQMqBhQMaBuPmjXu7rg6dzduQmyBlQMqBhQMaBiQMWAigEVc/s/nJcHx8VP73/qH+qlX4u7AaDiAFBxAKg4AFQcACoOABUHgNpcvMtugasgp3NO76vv/jyfi6BiEVQsgopFULEIKhZBxSKooXD4gOl8nTfdPwFW4LofKFCg/rNXz4OK50HF86DieVDx/B+Hmr7rA6de3a/uUe99mVMXOf0GBerrRU6/QYH6epHTb1Cgvl7k9PvtoXaL1IVOz00Ad/doTKBA1T0aEyhQdY/GBApU3aMxgfr9UFP/6oNP97gKV+d+nqsPn3q7RXb3gALVAioGVAyoGFAxbwt1NxPYrn+au/eN77j4/hxQMaBiQMWAigEVAyrmbaCeWnz3++576j91Xw0oUKDS76Di76Di76Di76Di738NKl84LHp6/yn80+c/+2MB1OqPBVCrPxZArf5YALX6YwHU6o8FUKs/FkCt/lgYHr77fVroeNH44LofKFCgQIECBQrUd4Wqvz+VCrk9XwdMA2t/esDR6w8CKgZUDKgYUDGgYkDFfBuo3Xd9yHTu9J4KBAoUKFCgQIEC9RTU3X6F3D1o+t7NOz33cs9YALX6YwHU6o8FUKs/FkCt/lgAtfpjAdTqjwVQqz8WLqY+fJp79fvu/Jd76sKg4sKg4sKg4sKg4sKg4sKg4sKgJAVUDKgYUDGgYkDFgIoBFQMqBlQMqBhQMaBiQMWAigEVAyoGVAyoGFAxoGJAxYCKARUDKgZUDKgYUDGgYkDFgIoBFfMT3wUhxgiLNikAAAAASUVORK5CYII=",
  },
};
