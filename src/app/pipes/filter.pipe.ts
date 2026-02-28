import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filter',
    standalone: true
})
export class FilterPipe implements PipeTransform {
    transform(items: any[], ...statuses: string[]): any[] {
        if (!items || !statuses || statuses.length === 0) return items;
        return items.filter(item => statuses.includes(item.status));
    }
}
