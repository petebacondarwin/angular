import { Component, Input } from '@angular/core';

import { Contributor } from './contributors.model';
import { CONTENT_URL_PREFIX } from 'app/documents/document.service';

@Component({
  selector: 'aio-contributor',
  template: `
    <div [ngClass]="{ 'flipped': person.isFlipped }" class="contributor-card">

        <div class="card-front" (click)="flipCard(person)">
            <h3>{{person.name}}</h3>

            <div class="contributor-image" [style.background-image]="'url('+pictureBase+(person.picture || noPicture)+')'">
                <div class="contributor-info">
                    <a *ngIf="person.bio" mat-button>
                        View Bio
                    </a>
                    <a *ngIf="person.twitter" mat-button class="icon"
                        href="https://twitter.com/{{person.twitter}}" target="_blank" (click)="$event.stopPropagation()">
                        <img src="assets/images/logos/twitter.svg">
                    </a>
                    <a *ngIf="person.website" mat-button class="icon"
                        href="{{person.website}}" target="_blank" (click)="$event.stopPropagation()">
                        <mat-icon>link</mat-icon>
                    </a>
                </div>
            </div>
        </div>

        <div class="card-back" *ngIf="person.isFlipped" (click)="flipCard(person)">
            <h3>{{person.name}}</h3>
            <p class="contributor-bio">{{person.bio}}</p>
        </div>
    </div>
  `
})
export class ContributorComponent {
  @Input() person: Contributor;
  noPicture = '_no-one.png';
  pictureBase = CONTENT_URL_PREFIX + 'images/bios/';

  flipCard(person) {
    person.isFlipped = !person.isFlipped;
  }
}
