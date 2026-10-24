export type CatalogTopic = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  status: "open" | "locked";
};

export type CatalogMiddleTopic = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  topics: CatalogTopic[];
};

export type CatalogGenre = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  middleTopics: CatalogMiddleTopic[];
};

export type Catalog = {
  genres: CatalogGenre[];
};

export type TopicFrame = {
  id: string;
  question: string;
  sortOrder: number | null;
};

export type TopicPeriod = {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed";
  frames: TopicFrame[];
};

export type TopicDetail = {
  id: string;
  name: string;
  description: string | null;
  status: "open" | "locked";
  middleTopic: {
    id: string;
    name: string;
    genre: {
      id: string;
      name: string;
    };
  };
  periods: TopicPeriod[];
};
