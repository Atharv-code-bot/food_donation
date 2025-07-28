import { Component, AfterViewInit } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import AOS from 'aos';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, LucideAngularModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit {
  last = true;
  navItems = [
    { label: 'How It Works', anchor: '#how-it-works' },
    { label: 'Impact', anchor: '#impact' },
    { label: 'For NGOs', anchor: '#ngo-signup' },
  ];

  async ngAfterViewInit() {
    AOS.init({
      duration: 1000,
      once: false,
      easing: 'ease-in-out',
      // mirror: true,
    });
  }

  features = [
    {
      icon: 'heart',
      title: 'Fight Hunger',
      desc: 'Help nourish families and individuals in need.',
    },
    {
      icon: 'leaf',
      title: 'Reduce Waste',
      desc: 'Turn surplus food into impactful donations.',
    },
    {
      icon: 'users',
      title: 'Build Community',
      desc: 'Connect donors and NGOs to strengthen support networks.',
    },
  ];
}
