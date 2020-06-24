import { Manga } from './shared/manga.model';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as firebase from 'firebase/app';
import 'firebase/database';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  allMangas = [];
  mangas = [];
  sorting: { column: string, order: number }; // 1 = asc, -1 = desc
  addMangaForm: FormGroup;

  constructor(private http: HttpClient) {
    firebase.initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
    this.sorting = { column: 'title', order: 1 }; // default sorting is by ascending title

    this.loadMangas();

    this.addMangaForm = new FormGroup({
      title: new FormControl(null, [Validators.required]),
      priority: new FormControl(null),
      lastChapterRead: new FormControl(null),
      releasedChapters: new FormControl(null)
    });
  }

  countMangas(status: string) {
    return this.allMangas.filter(manga => manga.status === status).length;
  }

  countHotMangas() {
    return this.allMangas.filter(manga => manga.hot === true).length;
  }

  filterAll() {
    this.mangas = this.allMangas;
  }

  filter(status: string) {
    this.mangas = this.allMangas.filter(manga => manga.status === status);
  }

  toggleSorting(column: string) {
    if (column === this.sorting.column) {
      // keep the current column and reverse the current order
      this.sorting.order = this.sorting.order * -1;
    } else {
      // change the sorting column and keep the current order
      this.sorting.column = column;
    }
    this.applySorting();
  }

  clickInput(manga: Manga, inputElement: HTMLInputElement) {
    manga.isEditing = true;
    inputElement.select();
  }

  onKeyPressed(manga: Manga, event: KeyboardEvent, inputElement: HTMLInputElement) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      manga.isEditing = false;
    } else if (event.key === 'Enter') {
      switch (inputElement.name) {
        case 'title': {
          this.saveTitle(manga, inputElement);
          break;
        }
        case 'priority': {
          this.savePriority(manga, inputElement);
          break;
        }
        case 'lastChapterRead': {
          this.saveLastChapterRead(manga, inputElement);
          break;
        }
        case 'releasedChapters': {
          this.saveReleasedChapters(manga, inputElement);
          break;
        }
      }
    }
  }

  saveTitle(manga: Manga, titleInput: HTMLInputElement) {
    this.saveField(manga, 'title', titleInput);
  }

  savePriority(manga: Manga, priorityInput: HTMLInputElement) {
    this.saveField(manga, 'priority', priorityInput);
  }

  saveLastChapterRead(manga: Manga, lastChapterReadInput: HTMLInputElement) {
    this.saveField(manga, 'lastChapterRead', lastChapterReadInput);
    this.updateHotStatus(manga, +lastChapterReadInput.value, manga.releasedChapters);
  }

  saveReleasedChapters(manga: Manga, releasedChaptersInput: HTMLInputElement) {
    this.saveField(manga, 'releasedChapters', releasedChaptersInput);
    this.updateHotStatus(manga, manga.lastChapterRead, +releasedChaptersInput.value);
  }

  private saveField(manga: Manga, fieldToModify: string, inputElement: HTMLInputElement) {
    firebase.database().ref('/mangas/' + manga.id)
      .child(fieldToModify)
      .set(inputElement.value, () => {
        this.loadMangas(manga.status);
      });
    manga.isEditing = false;
  }

  private updateHotStatus(manga: Manga, lastChapterRead: number, releasedChapters: number) {
    // updates the 'hot' tag for this manga
    manga.hot = (manga.status === 'in_progress' && releasedChapters > lastChapterRead);
    firebase.database().ref('/mangas/' + manga.id)
      .child('hot')
      .set(manga.hot, () => {
        this.loadMangas(manga.status);
      });
  }

  toggleChangeStatus(manga: Manga) {
    manga.isEditingStatus = !manga.isEditingStatus;
  }

  saveStatus(manga: Manga, newStatus: string) {
    firebase.database().ref('/mangas/' + manga.id)
      .child('status')
      .set(newStatus, () => {
        this.loadMangas(manga.status);
      });
    manga.isEditingStatus = false;
  }

  backgroundPublicationStoppedButton(manga: Manga) {
    return manga.isPublicationStopped ? { backgroundColor: '#8000F0', color: 'white' } : { backgroundColor: 'inherit', color: 'black' };
  }

  updatePublicationStopped(manga: Manga) {
    manga.isPublicationStopped = !manga.isPublicationStopped;
    firebase.database().ref('/mangas/' + manga.id)
      .child('isPublicationStopped')
      .set(manga.isPublicationStopped, () => {
        this.loadMangas(manga.status);
      });
  }

  removeManga(manga: Manga) {
    const deletionConfirmed = confirm(`Êtes-vous sûr.e de vouloir supprimer le manga '${manga.title}' ?`);
    if (deletionConfirmed) {
      firebase.database().ref('/mangas/' + manga.id).remove(() => this.loadMangas());
    }
  }

  onSubmitAddForm() {
    const manga: Manga = this.addMangaForm.value;
    manga.status = 'to_read';
    this.addNewManga(manga);
    this.addMangaForm.reset();
  }

  private loadMangas(statusFilter?: string) {
    this.http.get('https://manga-organnaizer.firebaseio.com/mangas.json')
      .pipe(map(response => {
        const mangas = [];
        for (const key in response) {
          if (response.hasOwnProperty(key)) {
            const manga = response[key];
            const title = manga.title || null;
            const status = manga.status || null;
            const priority = manga.priority || null;
            const lastChapterRead = manga.lastChapterRead || null;
            const releasedChapters = manga.releasedChapters || null;
            const hot = manga.hot || false;
            const isPublicationStopped = manga.isPublicationStopped || false;
            mangas.push({
              id: key,
              title,
              status,
              priority,
              lastChapterRead,
              releasedChapters,
              isEditing: false,
              isEditingStatus: false,
              hot,
              isPublicationStopped
            });
          }
        }
        return mangas;
      }))
      .subscribe(mangas => {
        this.allMangas = mangas;
        this.mangas = mangas;
        if (statusFilter) {
          this.filter(statusFilter);
        }
        this.applySorting();
      });
  }

  private applySorting() {
    switch (this.sorting.column) {
      case 'title': {
        this.mangas.sort((m1, m2) => m1.title.localeCompare(m2.title) * this.sorting.order);
        break;
      }
      case 'priority': {
        this.mangas.sort((m1, m2) => (m1.priority - m2.priority) * this.sorting.order);
        break;
      }
      case 'releasedChapters': {
        this.mangas.sort((m1, m2) => (m1.releasedChapters - m2.releasedChapters) * this.sorting.order);
        break;
      }
      default: {
        this.mangas.sort((m1, m2) => m1.title.localeCompare(m2.title) * this.sorting.order);
        break;
      }
    }
  }

  private addNewManga(manga: Manga) {
    const ref = firebase.database().ref('/mangas');
    ref.orderByChild('title').equalTo(manga.title.trim()).once('value', mangaSnapshot => {
      if (mangaSnapshot.exists()) {
        alert('Ce manga est déjà dans votre bibliothèque !');
      } else {
        this.http.post('https://manga-organnaizer.firebaseio.com/mangas.json', manga).subscribe(response => {
          console.log(response);
          this.loadMangas(); // reload mangas list
        });
      }
    });
  }

}
