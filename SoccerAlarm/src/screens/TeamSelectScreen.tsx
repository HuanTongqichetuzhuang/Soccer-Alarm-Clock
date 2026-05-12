// 主队选择页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { teams, leagues } from '../data/mockData';
import { StorageService } from '../services/StorageService';
import { Team, League } from '../types';

interface Props {
  onSelectTeam: (teamId: number | null) => void;
  currentFavoriteId: number | null;
}

export const TeamSelectScreen: React.FC<Props> = ({ onSelectTeam, currentFavoriteId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [favoriteId, setFavoriteId] = useState<number | null>(currentFavoriteId);

  useEffect(() => {
    setFavoriteId(currentFavoriteId);
  }, [currentFavoriteId]);

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          team.shortName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLeague = selectedLeague ? team.leagueId === selectedLeague : true;
    return matchesSearch && matchesLeague;
  });

  const handleSelectTeam = async (team: Team) => {
    const newId = team.id === favoriteId ? null : team.id;
    setFavoriteId(newId);
    await StorageService.setFavoriteTeam(newId);
    onSelectTeam(newId);
  };

  const renderLeagueFilter = ({ item }: { item: League }) => (
    <TouchableOpacity
      style={[
        styles.leagueChip,
        selectedLeague === item.id && styles.leagueChipSelected,
      ]}
      onPress={() => setSelectedLeague(selectedLeague === item.id ? null : item.id)}
    >
      <Text style={styles.leagueLogo}>{item.logo}</Text>
      <Text style={[
        styles.leagueName,
        selectedLeague === item.id && styles.leagueNameSelected,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderTeam = ({ item }: { item: Team }) => {
    const isFavorite = favoriteId === item.id;
    const league = leagues.find(l => l.id === item.leagueId);
    
    return (
      <TouchableOpacity
        style={[styles.teamCard, isFavorite && styles.teamCardSelected]}
        onPress={() => handleSelectTeam(item)}
      >
        <View style={styles.teamLogo}>
          <Text style={styles.teamEmoji}>{item.logo}</Text>
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.name}</Text>
          <Text style={styles.teamLeague}>
            {league?.logo} {league?.name}
          </Text>
        </View>
        <View style={[styles.favoriteIndicator, isFavorite && styles.favoriteActive]}>
          <Text style={styles.favoriteIcon}>{isFavorite ? '⭐' : '☆'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚽ 选择主队</Text>
        <Text style={styles.subtitle}>选择你支持的球队，设置专属提醒</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索球队..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.leagueFilterContainer}>
        <FlatList
          horizontal
          data={leagues}
          renderItem={renderLeagueFilter}
          keyExtractor={item => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueList}
        />
      </View>

      {favoriteId && (
        <View style={styles.favoriteBanner}>
          <Text style={styles.favoriteText}>
            ⭐ 已设置 {teams.find(t => t.id === favoriteId)?.name} 为主队
          </Text>
          <TouchableOpacity onPress={() => handleSelectTeam(teams.find(t => t.id === favoriteId)!)}>
            <Text style={styles.clearFavorite}>清除</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTeams}
        renderItem={renderTeam}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.teamList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leagueFilterContainer: {
    height: 50,
    marginBottom: Spacing.sm,
  },
  leagueList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  leagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leagueChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  leagueLogo: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  leagueName: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  leagueNameSelected: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  favoriteBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.accent + '20',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  favoriteText: {
    color: Colors.accent,
    fontSize: FontSizes.sm,
  },
  clearFavorite: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  teamList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '10',
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamEmoji: {
    fontSize: 24,
  },
  teamInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  teamName: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
  },
  teamLeague: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  favoriteIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteActive: {
    backgroundColor: Colors.accent + '30',
  },
  favoriteIcon: {
    fontSize: 20,
    color: Colors.accent,
  },
});
