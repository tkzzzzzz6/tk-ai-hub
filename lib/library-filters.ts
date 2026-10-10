import type {Resource} from "./catalog";
import {topicOf} from "./taxonomy";

export type LibraryFilters = {
  category: string;
  topic: string;
  tag: string;
  query: string;
  onlyFavorites: boolean;
  favorites: string[];
  sort: string;
};

export function filterLibrary(resources: Resource[], filters: LibraryFilters): Resource[] {
  const query = filters.query.trim().toLowerCase();
  const saved = new Set(filters.favorites);
  return resources.filter(resource =>
    (!filters.onlyFavorites || saved.has(resource.id)) &&
    (filters.category === "全部" || resource.category === filters.category) &&
    (filters.topic === "全部用途" || topicOf(resource) === filters.topic) &&
    (filters.tag === "全部标签" || resource.tags.includes(filters.tag)) &&
    [resource.title, resource.description, resource.tags.join(" "), resource.content,
      resource.titleEn || "", resource.descriptionEn || "", resource.contentEn || "", topicOf(resource)]
      .join(" ").toLowerCase().includes(query)
  ).sort((a, b) => filters.sort === "最近更新" ? (b.updatedAt || "").localeCompare(a.updatedAt || "") : 0);
}
