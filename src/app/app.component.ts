import { Manga } from './shared/manga.model';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
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
  isSortedByTitle = true;
  isSortedByPriority = false;
  addMangaForm: FormGroup;

  constructor(private http: HttpClient) {
    firebase.initializeApp(environment.firebaseConfig);
  }

  ngOnInit() {
    this.loadMangas();

    this.addMangaForm = new FormGroup({
      title: new FormControl(null, [Validators.required]),
      priority: new FormControl(null),
      lastChapterRead: new FormControl(null),
      releasedChapters: new FormControl(null)
    });
  }

  filterAll() {
    this.mangas = this.allMangas;
  }

  filter(status: string) {
    this.mangas = this.allMangas.filter(manga => manga.status === status);
  }

  sortByTitle() {
    if (this.isSortedByTitle) {
      this.mangas.reverse();
    } else {
      this.mangas.sort((a, b) => {
        if (a.title <= b.title) {
          return -1;
        }
        if (a.title > b.title) {
          return 1;
        }
      });
      this.isSortedByTitle = true;
      this.isSortedByPriority = false;
    }
  }

  sortByPriority() {
    if (this.isSortedByPriority) {
      this.mangas.reverse();
    } else {
      this.mangas.sort((a, b) => a.priority - b.priority);
      this.isSortedByPriority = true;
      this.isSortedByTitle = false;
    }
  }

  clickInput(manga: Manga, inputElement: HTMLInputElement) {
    manga.isEditing = true;
    inputElement.select();
  }

  onKeyPressed(manga: Manga, event: KeyboardEvent, inputElement: HTMLInputElement) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      manga.isEditing = false;
    } else if (event.key === 'Enter') {
      this.saveField(manga, inputElement.name, inputElement);
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
  }

  saveReleasedChapters(manga: Manga, releasedChaptersInput: HTMLInputElement) {
    this.saveField(manga, 'releasedChapters', releasedChaptersInput);
  }

  private saveField(manga: Manga, fieldToModify: string, inputElement: HTMLInputElement) {
    firebase.database().ref('/mangas/' + manga.id)
      .child(fieldToModify)
      .set(inputElement.value, () => {
        this.loadMangas();
      });
    manga.isEditing = false;
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
            mangas.push({
              id: key,
              title,
              status,
              priority,
              lastChapterRead,
              releasedChapters,
              isEditing: false,
              isEditingStatus: false
            });
          }
        }
        mangas.sort((a, b) => {
          if (a.title <= b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
        });
        return mangas;
      }))
      .subscribe(mangas => {
        this.allMangas = mangas;
        this.mangas = mangas;
        if (statusFilter) {
          this.filter(statusFilter);
        }
      });
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
