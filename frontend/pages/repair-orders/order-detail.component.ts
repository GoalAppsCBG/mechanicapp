import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { RepairOrderService } from '../../services/repair-order.service';
import { InventoryService } from '../../services/inventory.service';
import { RepairOrderPhotoService } from '../../services/repair-order-photo.service';
import { AppSettingsService } from '../../services/app-settings.service';
import { AuthService } from '../../services/auth.service';
import { RepairOrder } from '../../models/repair-order';
import { RepairOrderServiceItem } from '../../models/repair-order-service';
import { RepairOrderPartItem } from '../../models/repair-order-part';
import { RepairOrderPhoto } from '../../models/repair-order-photo';
import { MechanicService as MechanicServiceModel } from '../../models/mechanic-service';
import { Part } from '../../models/part';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';
import { CurrencyService } from '../../services/currency.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { markDirty } from '../../utils/mark-dirty';

@Component({
  selector: 'app-order-detail',
  imports: [FormsModule, RouterModule, DatePipe, DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (order) {
      <div class="module-page">
        <div class="page-header">
          <h1>
            &#128736; {{ 'orderDetail.title' | translate }} #{{ order.id }}
          </h1>
          <p>
            {{ order.carInfo || 'N/A' }} &mdash;
            {{ getStatusLabel(order.status) }}
          </p>
        </div>
        <div class="page-actions">
          <a routerLink="/repair-orders" class="btn btn-outline"
            >&larr; {{ 'orders.viewOrders' | translate }}</a
          >
          @if (authService.canSeePrices) {
            <a
              [routerLink]="['/repair-orders', order.id, 'invoice']"
              class="btn btn-primary"
              >&#128424; {{ 'orderDetail.invoice' | translate }}</a
            >
          }
          <button
            class="btn btn-whatsapp"
            (click)="shareViaWhatsApp()"
            [title]="'orderDetail.shareWhatsApp' | translate"
          >
            &#128172; {{ 'orderDetail.shareWhatsApp' | translate }}
          </button>
        </div>
        @if (orderErrorMsg) {
          <div class="error-message">{{ orderErrorMsg }}</div>
        }
        @if (orderSuccessMsg) {
          <div class="success-message">
            {{ orderSuccessMsg }}
          </div>
        }
        <div class="order-summary">
          <div class="summary-row">
            <span
              ><strong>{{ 'orders.mechanic' | translate }}:</strong>
              {{
                order.mechanicName || ('orders.unassigned' | translate)
              }}</span
            >
            <span
              ><strong>{{ 'orders.date' | translate }}:</strong>
              {{ order.orderDate | date: 'short' }}</span
            >
            @if (authService.canSeePrices) {
              <span class="total-badge"
                ><strong>{{ 'orders.total' | translate }}:</strong>
                {{ order.currencySymbol || currSymbol
                }}{{ order.totalCost | number: '1.2-2' }}</span
              >
            }
          </div>
          <div class="summary-row" style="margin-top: 12px; gap: 12px;">
            <label
              ><strong>{{ 'common.status' | translate }}:</strong>
              <select
                [(ngModel)]="order.status"
                class="inline-edit-input"
                style="margin-left: 6px;"
              >
                <option value="Pending">
                  {{ 'status.pending' | translate }}
                </option>
                <option value="In Progress">
                  {{ 'status.inProgress' | translate }}
                </option>
                <option value="Completed">
                  {{ 'status.completed' | translate }}
                </option>
                <option value="Cancelled">
                  {{ 'status.cancelled' | translate }}
                </option>
              </select>
            </label>
            <label style="flex: 1;"
              ><strong>{{ 'orders.notes' | translate }}:</strong>
              <input
                type="text"
                [(ngModel)]="order.notes"
                class="inline-edit-input"
                style="margin-left: 6px; width: 100%;"
              />
            </label>
            <button class="btn btn-primary btn-sm" (click)="saveOrderHeader()">
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
        <!-- SERVICES SECTION -->
        <div class="section-card">
          <h2>
            &#128295; {{ 'orderDetail.services' | translate }} ({{
              orderServices.length
            }})
          </h2>
          <div class="add-line-form">
            <select
              [(ngModel)]="newService.serviceId"
              name="serviceId"
              (change)="onServiceSelect()"
            >
              <option [ngValue]="0">
                -- {{ 'orderDetail.selectService' | translate }} --
              </option>
              @for (s of availableServices; track s) {
                <option [ngValue]="s.id">
                  {{ s.name }}
                  @if (authService.canSeePrices) {
                    ({{ s.currencySymbol || currSymbol
                    }}{{ s.basePrice | number: '1.2-2' }})
                  }
                </option>
              }
            </select>
            <input
              type="number"
              [(ngModel)]="newService.quantity"
              name="sQty"
              min="1"
              placeholder="Qty"
              class="qty-input"
            />
            @if (authService.canSeePrices) {
              <input
                type="number"
                [(ngModel)]="newService.unitPrice"
                name="sPrice"
                min="0"
                step="0.01"
                placeholder="Price"
                class="price-input"
              />
            }
            <button
              class="btn btn-primary btn-sm"
              (click)="addService()"
              [disabled]="!newService.serviceId"
            >
              +
            </button>
          </div>
          @if (orderServices.length > 0) {
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>{{ 'orderDetail.serviceName' | translate }}</th>
                  <th>{{ 'common.category' | translate }}</th>
                  <th>{{ 'common.qty' | translate }}</th>
                  @if (authService.canSeePrices) {
                    <th>{{ 'common.price' | translate }}</th>
                  }
                  @if (authService.canSeePrices) {
                    <th>{{ 'orderDetail.subtotal' | translate }}</th>
                  }
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (s of orderServices; track s) {
                  <tr>
                    <td>{{ s.serviceName }}</td>
                    <td>{{ s.serviceCategory }}</td>
                    <td>{{ s.quantity }}</td>
                    @if (authService.canSeePrices) {
                      <td>
                        {{ s.currencySymbol || currSymbol
                        }}{{ s.unitPrice | number: '1.2-2' }}
                      </td>
                    }
                    @if (authService.canSeePrices) {
                      <td>
                        {{ s.currencySymbol || currSymbol
                        }}{{ s.quantity * s.unitPrice | number: '1.2-2' }}
                      </td>
                    }
                    <td>
                      <button
                        class="btn-icon btn-delete"
                        (click)="removeService(s.id!)"
                      >
                        &#128465;
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @if (orderServices.length === 0) {
            <p class="empty-hint">
              {{ 'orderDetail.noServices' | translate }}
            </p>
          }
        </div>
        <!-- PARTS SECTION -->
        <div class="section-card">
          <h2>
            &#9881; {{ 'orderDetail.parts' | translate }} ({{
              orderParts.length
            }})
          </h2>
          <div class="add-line-form">
            <select
              [(ngModel)]="newPart.partId"
              name="partId"
              (change)="onPartSelect()"
            >
              <option [ngValue]="0">
                -- {{ 'orderDetail.selectPart' | translate }} --
              </option>
              @for (p of availableParts; track p) {
                <option [ngValue]="p.id">
                  {{ p.name }} [{{ p.quantity }}
                  {{ 'orderDetail.inStock' | translate }}]
                  @if (authService.canSeePrices) {
                    ({{ p.currencySymbol || currSymbol
                    }}{{ p.sellPrice | number: '1.2-2' }})
                  }
                </option>
              }
            </select>
            <input
              type="number"
              [(ngModel)]="newPart.quantity"
              name="pQty"
              min="1"
              placeholder="Qty"
              class="qty-input"
            />
            @if (authService.canSeePrices) {
              <input
                type="number"
                [(ngModel)]="newPart.unitPrice"
                name="pPrice"
                min="0"
                step="0.01"
                placeholder="Price"
                class="price-input"
              />
            }
            <button
              class="btn btn-primary btn-sm"
              (click)="addPart()"
              [disabled]="!newPart.partId"
            >
              +
            </button>
          </div>
          @if (orderParts.length > 0) {
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>{{ 'orderDetail.partName' | translate }}</th>
                  <th>{{ 'parts.partNumber' | translate }}</th>
                  <th>{{ 'common.qty' | translate }}</th>
                  @if (authService.canSeePrices) {
                    <th>{{ 'common.price' | translate }}</th>
                  }
                  @if (authService.canSeePrices) {
                    <th>{{ 'orderDetail.subtotal' | translate }}</th>
                  }
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of orderParts; track p) {
                  <tr>
                    <td>{{ p.partName }}</td>
                    <td>{{ p.partNumber || '-' }}</td>
                    <td>{{ p.quantity }}</td>
                    @if (authService.canSeePrices) {
                      <td>
                        {{ p.currencySymbol || currSymbol
                        }}{{ p.unitPrice | number: '1.2-2' }}
                      </td>
                    }
                    @if (authService.canSeePrices) {
                      <td>
                        {{ p.currencySymbol || currSymbol
                        }}{{ p.quantity * p.unitPrice | number: '1.2-2' }}
                      </td>
                    }
                    <td>
                      <button
                        class="btn-icon btn-delete"
                        (click)="removePart(p.id!)"
                      >
                        &#128465;
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @if (orderParts.length === 0) {
            <p class="empty-hint">
              {{ 'orderDetail.noParts' | translate }}
            </p>
          }
        </div>
        <!-- PHOTOS SECTION -->
        <div class="section-card">
          <h2>
            &#128247; {{ 'orderDetail.photos' | translate }} ({{
              photos.length
            }})
          </h2>
          <div class="photo-upload-form">
            <input
              type="file"
              #fileInput
              (change)="onFilesSelected($event)"
              multiple
              accept="image/*"
              class="file-input"
            />
            <input
              type="text"
              [(ngModel)]="photoDescription"
              [placeholder]="'orderDetail.photoDescription' | translate"
              class="inline-edit-input"
              style="flex: 1;"
            />
            <button
              class="btn btn-primary btn-sm"
              (click)="uploadPhotos()"
              [disabled]="selectedFiles.length === 0 || uploading"
            >
              {{
                uploading
                  ? ('common.uploading' | translate)
                  : ('orderDetail.uploadPhotos' | translate)
              }}
            </button>
          </div>
          @if (photoErrorMsg) {
            <div class="error-message">
              {{ photoErrorMsg }}
            </div>
          }
          @if (photoSuccessMsg) {
            <div class="success-message">
              {{ photoSuccessMsg }}
            </div>
          }
          @if (photos.length > 0) {
            <div class="photo-gallery">
              @for (photo of photos; track photo) {
                <div class="photo-card">
                  <img
                    [src]="photo.filePath"
                    [alt]="photo.fileName"
                    class="photo-thumb"
                    (click)="openLightbox(photo)"
                  />
                  <div class="photo-info">
                    <span class="photo-name">{{ photo.fileName }}</span>
                    @if (photo.description) {
                      <span class="photo-desc">{{ photo.description }}</span>
                    }
                    <button
                      class="btn-icon btn-delete"
                      (click)="deletePhoto(photo.id!)"
                      [title]="'common.delete' | translate"
                    >
                      &#128465;
                    </button>
                  </div>
                </div>
              }
            </div>
          }
          @if (photos.length === 0) {
            <p class="empty-hint">
              {{ 'orderDetail.noPhotos' | translate }}
            </p>
          }
        </div>
        <!-- Lightbox -->
        @if (lightboxPhoto) {
          <div class="lightbox-overlay" (click)="closeLightbox()">
            <div class="lightbox-content" (click)="$event.stopPropagation()">
              <button class="lightbox-close" (click)="closeLightbox()">
                &times;
              </button>
              <img
                [src]="lightboxPhoto.filePath"
                [alt]="lightboxPhoto.fileName"
              />
              @if (lightboxPhoto.description) {
                <p>
                  {{ lightboxPhoto.description }}
                </p>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    '.order-summary { background: var(--card-bg, #f8f9fa); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; } .summary-row { display: flex; gap: 24px; flex-wrap: wrap; align-items: center; } .total-badge { background: var(--primary, #0d6efd); color: #fff; padding: 4px 12px; border-radius: 4px; } .section-card { background: var(--card-bg, #fff); border: 1px solid var(--border, #dee2e6); border-radius: 8px; padding: 16px; margin-bottom: 20px; } .section-card h2 { margin: 0 0 12px; font-size: 1.1rem; } .add-line-form { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; } .add-line-form select { flex: 2; min-width: 200px; } .qty-input { width: 70px; } .price-input { width: 100px; } .btn-sm { padding: 6px 12px; font-size: 0.9rem; } .empty-hint { opacity: 0.6; font-style: italic; } .btn-whatsapp { background: #25D366; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.95rem; } .btn-whatsapp:hover { background: #1DA851; } .photo-upload-form { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; } .file-input { flex: 1; min-width: 200px; } .photo-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-top: 12px; } .photo-card { border: 1px solid var(--border, #dee2e6); border-radius: 8px; overflow: hidden; background: var(--card-bg, #fff); } .photo-thumb { width: 100%; height: 120px; object-fit: cover; cursor: pointer; transition: opacity 0.2s; } .photo-thumb:hover { opacity: 0.8; } .photo-info { padding: 8px; display: flex; flex-direction: column; gap: 4px; position: relative; } .photo-name { font-size: 0.8rem; word-break: break-all; opacity: 0.7; } .photo-desc { font-size: 0.85rem; } .photo-info .btn-delete { position: absolute; top: 4px; right: 4px; } .lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; } .lightbox-content { position: relative; max-width: 90vw; max-height: 90vh; text-align: center; } .lightbox-content img { max-width: 100%; max-height: 80vh; border-radius: 8px; } .lightbox-content p { color: #fff; margin-top: 12px; font-size: 1rem; } .lightbox-close { position: absolute; top: -16px; right: -16px; background: #fff; border: none; font-size: 1.5rem; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; line-height: 1; }',
  ],
})
export class OrderDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  order!: RepairOrder;
  orderServices: RepairOrderServiceItem[] = [];
  orderParts: RepairOrderPartItem[] = [];
  availableServices: MechanicServiceModel[] = [];
  availableParts: Part[] = [];
  photos: RepairOrderPhoto[] = [];
  orderErrorMsg = '';
  orderSuccessMsg = '';
  photoErrorMsg = '';
  photoSuccessMsg = '';
  currSymbol = '₡';
  whatsAppPhone = '';

  /* Photo upload */
  selectedFiles: File[] = [];
  photoDescription = '';
  uploading = false;
  lightboxPhoto: RepairOrderPhoto | null = null;

  newService: RepairOrderServiceItem = {
    repairOrderId: 0,
    serviceId: 0,
    quantity: 1,
    unitPrice: 0,
  };
  newPart: RepairOrderPartItem = {
    repairOrderId: 0,
    partId: 0,
    quantity: 1,
    unitPrice: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private repairOrderService: RepairOrderService,
    private inventoryService: InventoryService,
    private photoService: RepairOrderPhotoService,
    private appSettings: AppSettingsService,
    private currencyService: CurrencyService,
    public ts: TranslationService,
    public authService: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/repair-orders']);
      return;
    }
    this.newService.repairOrderId = id;
    this.newPart.repairOrderId = id;
    this.loadOrder(id);
    this.loadOrderServices(id);
    this.loadOrderParts(id);
    this.loadPhotos(id);
    this.inventoryService
      .getServices()
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((s) => (this.availableServices = s.filter((x) => x.isActive)));
    this.inventoryService
      .getParts()
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((p) => (this.availableParts = p));
    this.currencyService
      .getDefaultSymbol()
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((s) => (this.currSymbol = s));
    this.whatsAppPhone =
      this.appSettings.current.whatsAppPhone ||
      this.appSettings.current.phone ||
      '';
  }

  loadOrder(id: number) {
    this.repairOrderService
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((o) => (this.order = o));
  }
  loadOrderServices(id: number) {
    this.repairOrderService
      .getOrderServices(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((s) => (this.orderServices = s));
  }
  loadOrderParts(id: number) {
    this.repairOrderService
      .getOrderParts(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((p) => (this.orderParts = p));
  }

  onServiceSelect() {
    const svc = this.availableServices.find(
      (s) => s.id === this.newService.serviceId,
    );
    if (svc) this.newService.unitPrice = svc.basePrice;
  }

  onPartSelect() {
    const part = this.availableParts.find((p) => p.id === this.newPart.partId);
    if (part) this.newPart.unitPrice = part.sellPrice;
  }

  addService() {
    if (!this.newService.serviceId || this.newService.quantity < 1) {
      this.toast.error(this.ts.t('common.fieldsRequired'));
      return;
    }
    this.orderErrorMsg = '';
    this.repairOrderService
      .addOrderService(this.newService)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe(() => {
        this.refreshAll();
        this.newService = {
          repairOrderId: this.order.id!,
          serviceId: 0,
          quantity: 1,
          unitPrice: 0,
        };
      });
  }

  addPart() {
    if (!this.newPart.partId || this.newPart.quantity < 1) {
      this.toast.error(this.ts.t('common.fieldsRequired'));
      return;
    }
    this.orderErrorMsg = '';
    this.repairOrderService
      .addOrderPart(this.newPart)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe(() => {
        this.refreshAll();
        this.newPart = {
          repairOrderId: this.order.id!,
          partId: 0,
          quantity: 1,
          unitPrice: 0,
        };
        this.inventoryService
          .getParts()
          .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
          .subscribe((p) => (this.availableParts = p));
      });
  }

  removeService(id: number) {
    this.repairOrderService
      .deleteOrderService(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe(() => this.refreshAll());
  }

  removePart(id: number) {
    this.repairOrderService
      .deleteOrderPart(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe(() => {
        this.refreshAll();
        this.inventoryService
          .getParts()
          .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
          .subscribe((p) => (this.availableParts = p));
      });
  }

  refreshAll() {
    if (!this.order?.id) return;
    this.loadOrder(this.order.id);
    this.loadOrderServices(this.order.id);
    this.loadOrderParts(this.order.id);
    this.loadPhotos(this.order.id);
  }

  /* ── Photo methods ── */
  loadPhotos(id: number) {
    this.photoService
      .getPhotos(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((p) => (this.photos = p));
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files ? Array.from(input.files) : [];
  }

  uploadPhotos() {
    if (this.selectedFiles.length === 0) return;
    this.uploading = true;
    this.photoErrorMsg = '';
    this.photoSuccessMsg = '';
    this.photoService
      .uploadPhotos(this.order.id!, this.selectedFiles, this.photoDescription)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe({
        next: (res) => {
          this.photoSuccessMsg = res.message;
          this.loadPhotos(this.order.id!);
          this.selectedFiles = [];
          this.photoDescription = '';
          this.uploading = false;
        },
        error: () => {
          this.photoErrorMsg = this.ts.t('orderDetail.photoUploadError');
          this.uploading = false;
        },
      });
  }

  deletePhoto(id: number) {
    this.photoService
      .deletePhoto(id)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe(() => {
        this.loadPhotos(this.order.id!);
      });
  }

  openLightbox(photo: RepairOrderPhoto) {
    this.lightboxPhoto = photo;
  }

  closeLightbox() {
    this.lightboxPhoto = null;
  }

  /* ── WhatsApp share ── */
  shareViaWhatsApp() {
    const phone = this.whatsAppPhone.replace(/[^0-9]/g, '');
    const lines: string[] = [
      `*${this.appSettings.current.appName} — ${this.ts.t('orderDetail.title')} #${this.order.id}*`,
      '',
      `${this.ts.t('orders.car')}: ${this.order.carInfo || 'N/A'}`,
      `${this.ts.t('common.status')}: ${this.getStatusLabel(this.order.status)}`,
      `${this.ts.t('orders.total')}: ${this.currSymbol}${this.order.totalCost?.toFixed(2)}`,
    ];
    if (this.order.notes) {
      lines.push(`${this.ts.t('orders.notes')}: ${this.order.notes}`);
    }
    if (this.orderServices.length > 0) {
      lines.push('', `*${this.ts.t('orderDetail.services')}:*`);
      this.orderServices.forEach((s) =>
        lines.push(
          `  • ${s.serviceName} x${s.quantity} — ${this.currSymbol}${(s.quantity * s.unitPrice).toFixed(2)}`,
        ),
      );
    }
    if (this.orderParts.length > 0) {
      lines.push('', `*${this.ts.t('orderDetail.parts')}:*`);
      this.orderParts.forEach((p) =>
        lines.push(
          `  • ${p.partName} x${p.quantity} — ${this.currSymbol}${(p.quantity * p.unitPrice).toFixed(2)}`,
        ),
      );
    }
    if (this.photos.length > 0) {
      lines.push(
        '',
        `📷 ${this.photos.length} ${this.ts.t('orderDetail.photos').toLowerCase()}`,
      );
      this.photos.forEach((ph) => {
        lines.push(`  ${window.location.origin}${ph.filePath}`);
      });
    }
    const text = encodeURIComponent(lines.join('\n'));
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  saveOrderHeader(): void {
    this.orderErrorMsg = '';
    this.orderSuccessMsg = '';
    this.repairOrderService
      .updateOrder(this.order)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe({
        next: () => {
          this.orderSuccessMsg = this.ts.t('common.updateSuccess');
          this.loadOrder(this.order.id!);
        },
        error: () => {
          this.orderErrorMsg = this.ts.t('common.updateError');
        },
      });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Pending: this.ts.t('status.pending'),
      'In Progress': this.ts.t('status.inProgress'),
      Completed: this.ts.t('status.completed'),
      Cancelled: this.ts.t('status.cancelled'),
    };
    return map[status] || status;
  }
}
