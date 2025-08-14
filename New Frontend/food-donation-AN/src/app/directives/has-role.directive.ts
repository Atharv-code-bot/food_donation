import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { TokenService } from '../services/token.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private currentRole: string | null;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private tokenService: TokenService
  ) {
    this.currentRole = this.tokenService.getUserRole();
  }

  @Input() set appHasRole(expectedRoles: string | string[]) {
    const roles = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];

    if (this.currentRole && roles.includes(this.currentRole)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
